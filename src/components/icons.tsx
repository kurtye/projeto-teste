import type { SVGProps } from 'react';

export function ArmyHelmetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8h4c4.42 0 8-3.58 8-8a10 10 0 0 0-10-10Z" />
      <path d="M18 13.36V14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-.64" />
      <path d="M12 2v4" />
    </svg>
  );
}
