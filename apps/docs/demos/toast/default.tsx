'use client';

import { Button, ToastProvider, useToast } from '@brand-studio/ui';

function AddToBasket() {
  const toast = useToast();
  return (
    <Button onClick={() => toast.add({ title: 'Added to basket', description: 'Ethiopia Guji, 250 g' })}>
      Add to basket
    </Button>
  );
}

export default function ToastDemo() {
  return (
    <ToastProvider>
      <AddToBasket />
    </ToastProvider>
  );
}
