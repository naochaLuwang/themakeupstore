'use client';

import { useRef, useState, useEffect } from 'react';

export default function JournalMedia({ post }: { post: any }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleVideoClick = (e: React.MouseEvent) => {
        // This stops the <Link> from navigating when clicking the video
        e.preventDefault();
        e.stopPropagation();

        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                setIsMuted(!isMuted); // Toggles sound if already playing
            }
        }
    };

    if (post.media_type === 'video') {
        return (
            <div className="relative w-full h-full group/media" onClick={handleVideoClick}>
                <video
                    ref={videoRef}
                    src={post.featured_media_url}
                    muted={isMuted}
                    loop
                    playsInline
                    className={`w-full h-full object-cover transition-all duration-700 
            ${isPlaying ? 'grayscale-0 scale-100' : 'grayscale scale-105'}`}
                />

                {/* Play/Pause Overlay for Mobile */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                        </div>
                    </div>
                )}

                {/* Sound Toggle UI */}
                {isPlaying && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="absolute bottom-4 right-4 z-20 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white"
                    >
                        {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        )}
                    </button>
                )}
            </div>
        );
    }

    // Instagram Embed (remains as iframe)
    if (post.media_type === 'instagram') {
        return (
            <iframe
                src={`${post.featured_media_url.split('?')[0]}embed/`}
                className="w-full h-full border-none pointer-events-auto"
                scrolling="no"
            />
        );
    }

    return (
        <img
            src={post.featured_media_url}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
            alt={post.title}
        />
    );
}