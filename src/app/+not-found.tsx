import { Redirect } from 'expo-router';

// Unknown address (old link, web preview path): go to the start screen instead of an error page.
export default function NotFound() {
  return <Redirect href="/" />;
}
