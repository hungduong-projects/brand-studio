/* Fictional data, shared with the website: ticket #2291, the cracked Orla lamp and the $84 refund. */

export const LIMIT = 50;

export type Doc = { kind: string; title: string; mono?: boolean; rows: { text: string; value?: string }[] };

export const docs: Record<string, Doc> = {
  returns: { kind: 'Help center', title: 'Returns and refunds', rows: [
    { text: 'Unused items can be returned within 30 days for a full refund.' },
    { text: 'Items damaged in transit are refunded in full. No return is needed.' },
    { text: 'Sale items can be exchanged for another size or colour.' },
    { text: 'Use the prepaid label in your order email.' },
  ] },
  payments: { kind: 'Help center', title: 'Payments', rows: [
    { text: 'We accept Visa, Mastercard and PayPal.' },
    { text: 'Refunds reach the original card in 3 to 5 business days.' },
    { text: 'Store credit appears in your account at once.' },
  ] },
  shipping: { kind: 'Help center', title: 'Delivery', rows: [
    { text: 'Standard delivery takes 3 to 5 business days.' },
    { text: 'If a parcel is more than 5 days late, we refund the shipping.' },
    { text: 'Track any order from the link in your dispatch email.' },
  ] },
  exchanges: { kind: 'Help center', title: 'Exchanges', rows: [
    { text: 'Swap any item for another size within 30 days.' },
    { text: 'We send the new size as soon as the return is scanned.' },
  ] },
  '48213': { kind: 'Order', title: '#48213', mono: true, rows: [
    { text: 'Placed', value: '11 Sep' }, { text: 'Delivered', value: '16 Sep' },
    { text: 'Orla table lamp', value: '$84.00' }, { text: 'Shipping', value: '$0.00' }, { text: 'Paid', value: 'Visa 4417' },
  ] },
  '48177': { kind: 'Order', title: '#48177', mono: true, rows: [
    { text: 'Placed', value: '8 Sep' }, { text: 'Delivered', value: '15 Sep' },
    { text: 'Tova side table', value: '$120.00' }, { text: 'Shipping', value: '$0.00' }, { text: 'Paid', value: 'Mastercard 0932' },
  ] },
  '48150': { kind: 'Order', title: '#48150', mono: true, rows: [
    { text: 'Placed', value: '2 Sep' }, { text: 'Status', value: 'In transit' },
    { text: 'Linen cushion cover x2', value: '$60.00' }, { text: 'Paid', value: 'Visa 2210' },
  ] },
  '48161': { kind: 'Order', title: '#48161', mono: true, rows: [
    { text: 'Placed', value: '5 Sep' }, { text: 'Delivered', value: '17 Sep' },
    { text: 'Shipping', value: '$12.00' }, { text: 'Paid', value: 'PayPal' },
  ] },
  '48190': { kind: 'Order', title: '#48190', mono: true, rows: [
    { text: 'Placed', value: '9 Sep' }, { text: 'Delivered', value: '13 Sep' },
    { text: 'Wool throw, size M', value: '$58.00' },
  ] },
  '48204': { kind: 'Order', title: '#48204', mono: true, rows: [
    { text: 'Placed', value: '14 Sep' }, { text: 'Dispatched', value: '15 Sep' },
    { text: 'Expected', value: '19 Sep' },
  ] },
};

/** A citation points at one row of one source document. */
export type Source = { doc: string; row: number };
export type Part = string | { cite: number; text: string };

export type Ticket = {
  id: string;
  customer: string;
  subject: string;
  message: string;
  order: string;
  received: string;
  /** Refund the reply would start, in dollars. 0 when no money moves. */
  refund: number;
  /** Chargebacks always go to a person: Deskhand reads the order but does not draft. */
  person?: boolean;
  reply: Part[];
  sources: Source[];
};

export const tickets: Ticket[] = [
  { id: '2291', customer: 'Priya N.', subject: 'Lamp arrived cracked', order: '48213', received: '09:12', refund: 84,
    message: 'The Orla lamp arrived with a cracked base. Can I get a refund?',
    reply: ['Hi Priya, sorry the lamp arrived cracked.', { cite: 1, text: 'Damaged items are refunded in full,' },
      'so no need to send it back. I’ve set up a refund of', { cite: 2, text: '$84.00 for order #48213.' },
      { cite: 3, text: 'It reaches your card in 3 to 5 business days.' }],
    sources: [{ doc: 'returns', row: 1 }, { doc: '48213', row: 2 }, { doc: 'payments', row: 1 }] },
  { id: '2266', customer: 'Marco D.', subject: 'Scratched table top', order: '48177', received: '08:47', refund: 120,
    message: 'The Tova side table has a long scratch across the top. It was a gift, so I’d rather not wait for a swap.',
    reply: ['Hi Marco, sorry about the scratch.', { cite: 1, text: 'Items damaged in transit are refunded in full,' },
      'so please keep the table. I’ve set up a refund of', { cite: 2, text: '$120.00 for order #48177.' },
      { cite: 3, text: 'It reaches your card in 3 to 5 business days.' }],
    sources: [{ doc: 'returns', row: 1 }, { doc: '48177', row: 2 }, { doc: 'payments', row: 1 }] },
  { id: '2276', customer: 'Dana K.', subject: 'Chargeback threat', order: '48150', received: '08:05', refund: 60, person: true,
    message: 'My cushion covers still haven’t arrived. If this isn’t fixed today I’m calling my bank.',
    reply: [], sources: [{ doc: '48150', row: 1 }] },
  { id: '2285', customer: 'Leo M.', subject: 'Parcel a week late', order: '48161', received: '07:58', refund: 12,
    message: 'My order took twelve days to arrive. Is that normal?',
    reply: ['Hi Leo, sorry for the wait.', { cite: 1, text: 'When a parcel is more than 5 days late, we refund the shipping,' },
      'so I’ve refunded', { cite: 2, text: '$12.00 for order #48161.' }],
    sources: [{ doc: 'shipping', row: 1 }, { doc: '48161', row: 2 }] },
  { id: '2279', customer: 'Ana R.', subject: 'Wrong size', order: '48190', received: '07:31', refund: 0,
    message: 'The throw is lovely but I ordered the wrong size. Can I swap it for a large?',
    reply: ['Hi Ana, happy to help.', { cite: 1, text: 'You can swap it for another size within 30 days.' },
      'Your order', { cite: 2, text: '#48190 arrived on 13 Sep,' }, 'so you have until 13 Oct.'],
    sources: [{ doc: 'exchanges', row: 0 }, { doc: '48190', row: 1 }] },
  { id: '2270', customer: 'Sam T.', subject: 'Where is my order?', order: '48204', received: '07:02', refund: 0,
    message: 'Hi, any news on my order? It’s been a few days.',
    reply: ['Hi Sam, your order', { cite: 1, text: '#48204 left us on 15 Sep' }, 'and', { cite: 2, text: 'should reach you by 19 Sep.' }],
    sources: [{ doc: '48204', row: 1 }, { doc: '48204', row: 2 }] },
];

export const ticket = (id: string) => tickets.find(t => t.id === id);
export const money = (n: number) => `$${n.toFixed(2)}`;
export const initials = (name: string) => name.split(/\s+/).map(w => w[0]).join('').replace('.', '');
