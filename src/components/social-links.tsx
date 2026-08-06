import { ExternalLink, Globe2 } from 'lucide-react';

type SocialLinksProps = {
  className?: string;
  showLabels?: boolean;
};

export function SocialLinks({
  className = 'flex items-center gap-2',
  showLabels = false,
}: SocialLinksProps) {
  return (
    <nav aria-label="Social links" className={className}>
      <a
        aria-label="LinkedIn"
        title="Visit LinkedIn"
        href="https://www.linkedin.com/"
        target="_blank"
        rel="noreferrer"
        className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted ${showLabels ? 'gap-2 px-2' : 'w-8'}`}
      >
        <svg
          aria-hidden="true"
          className="size-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.99h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM3.54 20.45H7.1V8.99H3.54v11.46ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
        {showLabels && (
          <>
            <span>Visit LinkedIn</span>
            <ExternalLink aria-hidden="true" className="size-3" />
          </>
        )}
      </a>
      <a
        aria-label="Developer website"
        title="Visit developer website"
        href="https://daskas-welt.github.io/"
        target="_blank"
        rel="noreferrer"
        className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted ${showLabels ? 'gap-2 px-2' : 'w-8'}`}
      >
        <Globe2 aria-hidden="true" className="size-4" />
        {showLabels && (
          <>
            <span>Visit developer website</span>
            <ExternalLink aria-hidden="true" className="size-3" />
          </>
        )}
      </a>
    </nav>
  );
}
