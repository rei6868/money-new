export const getServerSideProps = () => ({
  redirect: {
    destination: '/dashboard',
    permanent: false,
  },
});

export default function HomePage() {
  return null;
}
