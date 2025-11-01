type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function AppShell({ children }: AppShellProps) {
  return <div>{children}</div>;
}
