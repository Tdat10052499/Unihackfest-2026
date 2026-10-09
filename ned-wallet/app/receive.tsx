// /receive moved to /add-usdc (Milestone Lock: a client adds test USDC to lock contracts). Kept so old links still work;
// the Vietnam view never gets here (services/regionGuard.ts blocks both routes).
import React from 'react';
import { Redirect } from 'expo-router';

export default function ReceiveRedirect() {
  return <Redirect href="/add-usdc" />;
}
