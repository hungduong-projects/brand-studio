'use client';

import { ExplodedView } from '@/lab/exploded/exploded-view';
import { phone } from '@/lab/exploded/phone';
import { DemoTheme } from './demo-brand';

/** The home page's exploded phone, in the brand and mode picked in the header. */
export function ExplodedPhone() {
  return <DemoTheme className="exploded__figure"><ExplodedView models={phone} root="phone" fig="Fig. 1" /></DemoTheme>;
}
