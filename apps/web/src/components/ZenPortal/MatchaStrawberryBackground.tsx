import React from "react";

interface MatchaStrawberryBackgroundProps {
    children: React.ReactNode;
}

const MatchaStrawberryBackground: React.FC<MatchaStrawberryBackgroundProps> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#FAF9F6]">
            {/* Left Stripe Column */}
            <div
                className="fixed left-0 top-0 bottom-0 w-[15%] md:w-[25%] opacity-80 pointer-events-none z-0 hidden sm:block"
                style={{
                    backgroundImage: 'url(/images/bg-pattern.png)',
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'contain'
                }}
            />

            {/* Right Stripe Column */}
            <div
                className="fixed right-0 top-0 bottom-0 w-[15%] md:w-[25%] opacity-80 pointer-events-none z-0 hidden sm:block"
                style={{
                    backgroundImage: 'url(/images/bg-pattern.png)',
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'contain'
                }}
            />

            {/* Main Content */}
            <div className="relative z-10 min-h-screen">
                {children}
            </div>
        </div>
    );
};

export default MatchaStrawberryBackground;
