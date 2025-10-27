import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function resolveClassName(variant: ButtonVariant, size: ButtonSize, className?: string) {
  const classes = [styles.button];

  if (variant === "secondary") {
    classes.push(styles.buttonSecondary);
  } else if (variant === "ghost") {
    classes.push(styles.buttonGhost);
  } else {
    classes.push(styles.buttonPrimary);
  }

  if (size === "sm") {
    classes.push(styles.buttonSmall);
  }

  if (className) {
    classes.push(className);
  }

  return classes.join(" ");
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} className={resolveClassName(variant, size, className)} type={type} {...props} />
  );
});

export default Button;
