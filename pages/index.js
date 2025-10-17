export const getServerSideProps = () => ({
  redirect: {
    destination: '/transactions',
    permanent: false,
  },
});

export default function HomePage() {
  return null;
}
