import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import styles from './DynamicFormModal.module.css';

function flattenFields(items = []) {
  const result = [];
  items.forEach((item) => {
    if (!item) {
      return;
    }
    if (Array.isArray(item.fields)) {
      result.push(...flattenFields(item.fields));
      return;
    }
    if (item.name) {
      result.push(item);
    }
  });
  return result;
}

function resolveGroupId(group, index) {
  return group.id ?? group.name ?? `group-${index}`;
}

function isTabbedGroup(group) {
  const layout = group?.layout ?? group?.variant ?? group?.display ?? group?.type;
  if (!layout) {
    return false;
  }
  const normalized = String(layout).toLowerCase();
  return normalized === 'tab' || normalized === 'tabs';
}

export function DynamicFormModal({
  isOpen,
  title,
  description,
  fields = [],
  initialValues = {},
  onSubmit,
  onCancel,
  validate,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loadingLabel = 'Saving…',
  ariaLabel,
  footer,
}) {
  const groups = useMemo(
    () => (Array.isArray(fields) ? fields.filter((item) => Array.isArray(item?.fields)) : []),
    [fields],
  );
  const standaloneFields = useMemo(
    () => (Array.isArray(fields) ? fields.filter((item) => !Array.isArray(item?.fields)) : []),
    [fields],
  );
  const flatFields = useMemo(() => flattenFields(fields), [fields]);

  const defaultValues = useMemo(() => {
    const defaults = {};
    flatFields.forEach((field) => {
      const defaultValue =
        initialValues[field.name] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
      defaults[field.name] = defaultValue;
    });
    return defaults;
  }, [flatFields, initialValues]);

  const defaultTabId = useMemo(() => {
    if (groups.length === 0) {
      return null;
    }
    return resolveGroupId(groups[0], 0);
  }, [groups]);

  const [formValues, setFormValues] = useState(defaultValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTabId);

  const isTabbed = useMemo(() => groups.length > 0 && groups.every(isTabbedGroup), [groups]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFormValues(defaultValues);
    setErrors({});
    setIsSubmitting(false);
    setActiveTab(defaultTabId);
  }, [isOpen, defaultValues, defaultTabId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const handleFieldChange = useCallback((name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev || !prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      const validationErrors = validate?.(formValues) ?? {};
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      try {
        setIsSubmitting(true);
        await onSubmit?.(formValues);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          form: error?.message ?? 'An unexpected error occurred.',
        }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, isSubmitting, onSubmit, validate],
  );

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        onCancel?.(event);
      }
    },
    [onCancel],
  );

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  const renderField = (field) => {
    if (!field || !field.name) {
      return null;
    }

    const value = formValues[field.name];
    const error = errors?.[field.name];
    const helperText = field.helperText ?? field.description;
    const fieldId = field.id ?? field.name;

    if (typeof field.render === 'function') {
      return (
        <div
          key={field.name}
          className={styles.field}
          style={{ gridColumn: field.fullWidth ? '1 / -1' : undefined }}
        >
          {field.render({
            field,
            value,
            setValue: (next) => handleFieldChange(field.name, next),
            error,
            values: formValues,
            isSubmitting,
          })}
        </div>
      );
    }

    const commonProps = {
      id: fieldId,
      name: field.name,
      required: field.required,
      disabled: isSubmitting || field.disabled,
      placeholder: field.placeholder,
      ...field.inputProps,
    };

    let control = null;

    switch (field.type) {
      case 'textarea':
        control = (
          <textarea
            className={styles.textarea}
            value={value ?? ''}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
            {...commonProps}
          />
        );
        break;
      case 'select':
        control = (
          <select
            className={styles.select}
            value={value ?? ''}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
            {...commonProps}
          >
            {(field.placeholder || !field.required) && (
              <option value="">{field.placeholder ?? 'Select an option'}</option>
            )}
            {(field.options ?? []).map((option) => {
              if (typeof option === 'string') {
                return (
                  <option key={option} value={option}>
                    {option}
                  </option>
                );
              }
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>
        );
        break;
      case 'checkbox':
        control = (
          <label className={styles.checkboxRow} htmlFor={fieldId}>
            <input
              type="checkbox"
              id={fieldId}
              name={field.name}
              checked={Boolean(value)}
              onChange={(event) => handleFieldChange(field.name, event.target.checked)}
              disabled={isSubmitting || field.disabled}
              {...field.inputProps}
            />
            <span>{field.checkboxLabel ?? field.label}</span>
          </label>
        );
        break;
      case 'number':
      case 'date':
      case 'datetime-local':
      case 'password':
        control = (
          <input
            className={styles.input}
            type={field.type}
            value={value ?? ''}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
            {...commonProps}
          />
        );
        break;
      default:
        control = (
          <input
            className={styles.input}
            type={field.type ?? 'text'}
            value={value ?? ''}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
            {...commonProps}
          />
        );
        break;
    }

    const showLabel = field.type !== 'checkbox';

    return (
      <div
        key={field.name}
        className={styles.field}
        style={{ gridColumn: field.fullWidth ? '1 / -1' : undefined }}
      >
        {showLabel ? (
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor={fieldId}>
              {field.label}
              {field.required ? <span className={styles.required}>*</span> : null}
            </label>
            {helperText ? <span className={styles.helper}>{helperText}</span> : null}
          </div>
        ) : null}
        {control}
        {error ? <span className={styles.errorMessage}>{error}</span> : null}
      </div>
    );
  };

  const renderFieldGroup = (group, index) => {
    const groupId = resolveGroupId(group, index);
    const children = (group.fields ?? []).map((field) => renderField(field));

    if (children.length === 0) {
      return null;
    }

    return (
      <section key={groupId} className={styles.section} aria-labelledby={`${groupId}-label`}>
        <div className={styles.sectionHeader}>
          {group.title ? (
            <h3 className={styles.sectionTitle} id={`${groupId}-label`}>
              {group.title}
            </h3>
          ) : null}
          {group.description ? (
            <p className={styles.sectionDescription}>{group.description}</p>
          ) : null}
        </div>
        <div className={styles.fieldGrid}>{children}</div>
      </section>
    );
  };

  const renderTabPanel = (group, index) => {
    const groupId = resolveGroupId(group, index);
    const isActive = activeTab === groupId;
    return (
      <div
        key={groupId}
        className={styles.tabPanel}
        aria-hidden={isActive ? 'false' : 'true'}
      >
        {isActive ? renderFieldGroup(group, index) : null}
      </div>
    );
  };

  const renderContent = () => {
    if (groups.length === 0) {
      return <div className={styles.fieldGrid}>{flatFields.map(renderField)}</div>;
    }

    const standalone = standaloneFields.map(renderField);

    if (isTabbed) {
      return (
        <>
          {standalone.length > 0 ? (
            <div className={styles.fieldGrid}>{standalone}</div>
          ) : null}
          <div className={styles.tabs}>
            <div className={styles.tabList} role="tablist">
              {groups.map((group, index) => {
                const groupId = resolveGroupId(group, index);
                const isActive = activeTab === groupId;
                return (
                  <button
                    key={groupId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={styles.tabButton}
                    onClick={() => setActiveTab(groupId)}
                  >
                    {group.title ?? `Tab ${index + 1}`}
                  </button>
                );
              })}
            </div>
            {groups.map((group, index) => renderTabPanel(group, index))}
          </div>
        </>
      );
    }

    return (
      <>
        {standalone.length > 0 ? (
          <div className={styles.fieldGrid}>{standalone}</div>
        ) : null}
        {groups.map((group, index) => renderFieldGroup(group, index))}
      </>
    );
  };

  const overlayClasses = styles.overlay;

  return createPortal(
    <div className={overlayClasses} role="presentation" onClick={handleOverlayClick}>
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title ?? 'Form dialog'}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          {title ? <h2 className={styles.title}>{title}</h2> : null}
          {description ? <p className={styles.description}>{description}</p> : null}
        </header>
        <div className={styles.body}>
          {errors?.form ? <div className={styles.formError}>{errors.form}</div> : null}
          {renderContent()}
        </div>
        <footer className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? loadingLabel : submitLabel}
          </button>
        </footer>
        {footer}
      </form>
    </div>,
    document.body,
  );
}

DynamicFormModal.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.node,
  description: PropTypes.node,
  fields: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])),
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  validate: PropTypes.func,
  submitLabel: PropTypes.node,
  cancelLabel: PropTypes.node,
  loadingLabel: PropTypes.node,
  ariaLabel: PropTypes.string,
  footer: PropTypes.node,
};
