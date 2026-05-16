'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    window.location.href = '/SystemFlow.html';
  }, []);
  return null;
}
