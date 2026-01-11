import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to login page - middleware will handle authentication
  redirect('/login');
}
