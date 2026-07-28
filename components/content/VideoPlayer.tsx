import { ExternalLink, VideoOff } from "lucide-react";

function getVideoSource(url: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? { type: "embed", url: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parsed.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : "");
      return id ? { type: "embed", url: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? { type: "embed", url: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return { type: "direct", url };
    return { type: "external", url };
  } catch {
    return null;
  }
}

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const source = getVideoSource(url);

  if (!source) {
    return (
      <div className="grid aspect-video place-items-center bg-brand-900 px-6 text-center text-white">
        <div><VideoOff className="mx-auto h-10 w-10 text-brand-300" /><p className="mt-3 font-bold">No video has been added to this episode.</p></div>
      </div>
    );
  }

  if (source.type === "embed") {
    return (
      <iframe
        className="aspect-video h-full w-full"
        src={source.url}
        title={`${title} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (source.type === "direct") {
    return <video className="aspect-video h-full w-full bg-black" controls preload="metadata" src={source.url}>Your browser does not support video playback.</video>;
  }

  return (
    <div className="grid aspect-video place-items-center bg-brand-900 px-6 text-center text-white">
      <div><p className="font-bold">This video provider does not support embedded playback.</p><a href={source.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-900">Open video <ExternalLink className="h-4 w-4" /></a></div>
    </div>
  );
}

