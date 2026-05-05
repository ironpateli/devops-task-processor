export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1>Task Processor Cloud Dashboard</h1>
      <p>This is the production web app scaffold running on Next.js.</p>
      <ul>
        <li>Backend API: <code>/api/jobs</code> via gateway/load balancer</li>
        <li>Database: PostgreSQL</li>
        <li>Queue/Cache: Redis</li>
        <li>Deployment target: AWS ECS Fargate</li>
      </ul>
    </main>
  );
}
