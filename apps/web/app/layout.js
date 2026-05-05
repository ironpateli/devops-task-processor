export const metadata = {
  title: 'Task Processor Cloud Dashboard',
  description: 'Production-ready distributed task processor'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
