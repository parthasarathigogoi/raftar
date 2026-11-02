import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function GalleryAccessPage() {
  return <main className="gallery-access"><Link href="/" className="wordmark">RAF<span>TAR</span></Link><section><LockKeyhole /><p className="eyebrow">Private gallery</p><h1>Your journey, safely kept.</h1><p>RAFTAR galleries are private by default. Sign in with the account attached to your trip to revisit your photographs, films and delivered reels.</p><button>Sign in to your gallery <ArrowRight /></button><Link href="/">Return to RAFTAR</Link></section></main>;
}
