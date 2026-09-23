import { FooterDirectory } from '@brand-studio/ui';

export default function FooterDirectoryDemo() {
  return (
    <FooterDirectory
      notes={['Prices include tax. Kits ship with a strap and a body cap.', 'Service prices apply to cameras made after 2020.']}
      breadcrumbs={[{ label: 'Halden', href: '#home' }, { label: 'Cameras', href: '#cameras' }, { label: 'Halden R', href: '#r' }]}
      columns={[
        { title: 'Shop', links: [{ label: 'Cameras', href: '#cameras' }, { label: 'Lenses', href: '#lenses' }, { label: 'Film', href: '#film' }] },
        { title: 'Service', links: [{ label: 'Repairs', href: '#repairs' }, { label: 'Parts', href: '#parts' }] },
        { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }] },
      ]}
      legal={<p>Halden is a fictional brand.</p>}
    />
  );
}
