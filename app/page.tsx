import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, Clapperboard, Compass, Download, LockKeyhole, Play, Sparkles } from "lucide-react";

const experiences = [
  { name: "Solo Story", note: "A journey told in your own frame", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85" },
  { name: "Friends Forever", note: "The good kind of chaos, documented", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85" },
  { name: "Couple Chronicles", note: "A film of your shared wild", image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1000&q=85" },
  { name: "Wild Frames", note: "For the landscape-led explorer", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85" },
];

const frames = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1100&q=85",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1100&q=85",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1100&q=85",
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1100&q=85",
];

export default function Home() {
  return <main>
    <section className="film-hero">
      <video className="film-hero-video" autoPlay muted loop playsInline poster="https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=2400&q=90"><source src="https://assets.mixkit.co/videos/preview/mixkit-man-walking-on-a-hill-at-sunset-3989-large.mp4" type="video/mp4" /></video>
      <div className="film-wash" />
      <nav className="nav shell"><Link href="/" className="wordmark">RAF<span>TAR</span></Link><div className="nav-links"><a href="#experiences">Experiences</a><a href="#films">Films</a><a href="#frames">Photography</a><a href="#how">How it works</a></div><a className="nav-cta" href="#custom">Start your story <ArrowUpRight /></a></nav>
      <div className="film-hero-content shell"><p className="eyebrow light">Northeast India · Travel film & photography</p><h1>Travel.<br /><i>Live.</i> Relive.</h1><p>Go somewhere extraordinary. Let our photographers and filmmakers turn the way it felt into something you can hold onto.</p><div className="hero-actions"><a className="button button-sand" href="#experiences">Explore experiences <ArrowRight /></a><a className="film-play" href="#films"><Play /> Watch the film</a></div></div><p className="hero-tagline">RAFTAR — memories in motion</p>
    </section>

    <section className="manifest-intro shell"><p className="eyebrow">More than a trip</p><div><h2>The place is only<br />the beginning.</h2><p>RAFTAR brings together local travel expertise and a visual storytelling crew. Your route, the laughter between stops, the light on the road home — we take care to capture the whole story.</p></div><div className="intro-stats"><span><b>Travel</b> thoughtfully</span><span><b>Capture</b> beautifully</span><span><b>Relive</b> forever</span></div></section>

    <section id="experiences" className="experiences"><div className="shell"><div className="section-heading"><div><p className="eyebrow">Choose your story</p><h2>Experiences made to be remembered.</h2></div><a className="text-link dark-link" href="#custom">Build a custom one <ArrowRight /></a></div><div className="experience-grid">{experiences.map((item) => <article className="experience-card" key={item.name}><div className="experience-image"><Image src={item.image} alt={item.name} fill sizes="(max-width: 700px) 100vw, 25vw" /><div className="image-wash" /></div><div className="experience-copy"><p>{item.note}</p><h3>{item.name}</h3><span>Discover the experience <ArrowUpRight /></span></div></article>)}</div></div></section>

    <section id="films" className="film-showcase"><div className="film-still"><Image src="https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=2200&q=88" alt="Traveller on a mountain ridge at sunset" fill sizes="100vw" /><div className="film-wash" /></div><div className="film-showcase-copy shell"><p className="eyebrow light">RAFTAR films</p><h2>Not content.<br /><i>Something you feel.</i></h2><p>From slow, cinematic travel films to the reel you send to everyone before you are home, every edit is built around your real experience.</p><a className="film-play large" href="#custom"><Play /> See what we can create</a></div></section>

    <section id="frames" className="portfolio shell"><div className="section-heading"><div><p className="eyebrow">Field notes in frames</p><h2>Photography with a pulse.</h2></div><p className="section-aside">Candid, considered and always grounded in the moment.</p></div><div className="frame-grid">{frames.map((frame, index) => <div className={`frame frame-${index}`} key={frame}><Image src={frame} alt="RAFTAR travel photography portfolio" fill sizes="(max-width: 700px) 100vw, 50vw" /></div>)}</div></section>

    <section id="how" className="process"><div className="shell"><p className="eyebrow">Simple by design</p><h2>One journey. Three acts.</h2><div className="process-grid"><article><b>01</b><Compass /><h3>Travel</h3><p>We shape a trip around your pace, people and idea of extraordinary.</p></article><article><b>02</b><Camera /><h3>Capture</h3><p>Choose a photographer, filmmaker or both. We focus on the moments, not poses.</p></article><article><b>03</b><Clapperboard /><h3>Relive</h3><p>Your private gallery arrives with your edited photographs, film and reels.</p></article></div></div></section>

    <section className="delivery shell"><div className="delivery-photo"><Image src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1300&q=85" alt="Friends enjoying a view together" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="delivery-copy"><p className="eyebrow">Yours, privately</p><h2>Every memory has a home.</h2><p>When your trip is complete, your delivered photographs, films and reels live in a private, password-protected RAFTAR gallery. Share it with your people. Download it when you want.</p><div className="delivery-points"><span><LockKeyhole /> Private by default</span><span><Download /> Ready to download</span></div><Link className="text-link dark-link" href="/gallery">Explore your gallery <ArrowRight /></Link></div></section>

    <section id="custom" className="final-cta"><Image src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2200&q=85" alt="A winding road through a mountain valley" fill sizes="100vw" /><div className="film-wash" /><div className="final-cta-copy shell"><p className="eyebrow light">Your story is waiting</p><h2>Take the trip.<br /><i>Keep the feeling.</i></h2><a className="button button-sand" href="mailto:hello@raftar.travel">Plan your RAFTAR experience <ArrowRight /></a></div></section>

    <footer><div className="shell footer-grid"><div><Link href="/" className="wordmark">RAF<span>TAR</span></Link><p>Travel. Live.<br />Relive.</p></div><div><p className="footer-label">Experiences</p><a href="#experiences">Travel experiences</a><a href="#films">RAFTAR films</a><a href="#frames">Photography</a></div><div><p className="footer-label">Your memories</p><Link href="/gallery">Private gallery</Link><a href="#custom">Create a journey</a><a href="mailto:hello@raftar.travel">hello@raftar.travel</a></div><div className="newsletter"><p className="footer-label">From the road</p><p>Dispatches from the Northeast, in pictures and stories.</p><form><input aria-label="Email address" type="email" placeholder="Your email address"/><button aria-label="Subscribe"><ArrowRight /></button></form></div></div><div className="shell footer-bottom"><span>© 2026 RAFTAR</span><span>Travel. Live. Relive.</span></div></footer>
  </main>;
}
