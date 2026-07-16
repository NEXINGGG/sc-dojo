import type { ReactNode, SVGProps } from 'react';

type IconName = 'home' | 'practice' | 'exam' | 'progress' | 'settings' | 'theme';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

const paths: Record<IconName, ReactNode> = {
  home: <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Zm6 11v-6h6v6" />,
  practice: (
    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h8M8 12h8M8 16h5" />
  ),
  exam: <path d="M7 3h10v4H7zM5 7h14v14H5zM8 11h8M8 15h5" />,
  progress: <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" />,
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6.5-1.4 1.4M6.9 17.1 5.5 18.5m0-13 1.4 1.4m10.2 10.2 1.4 1.4" />
  ),
  theme: <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" />,
};

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
