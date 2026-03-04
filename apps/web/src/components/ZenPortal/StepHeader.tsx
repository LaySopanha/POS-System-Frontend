import { ArrowLeft, ShoppingCart, Languages, User, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepHeaderProps {
    step: string;
    stepTitle?: string;
    goBack: () => void;
    cartLength: number;
    setShowCart: (show: boolean) => void;
    navigate?: (path: string) => void;
    customer?: any;
}

const StepHeader: React.FC<StepHeaderProps> = ({
    step,
    stepTitle,
    goBack,
    cartLength,
    setShowCart,
    navigate,
    customer,
}) => {
    const { i18n, t } = useTranslation();

    if (step === "success") return null;

    const toggleLanguage = () => {
        const nextLng = i18n.language === 'en' ? 'km' : 'en';
        i18n.changeLanguage(nextLng);
    };

    const isHome = step === "home";

    return (
        <div className="sticky top-0 z-50 backdrop-blur-md bg-transparent">
            <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
                <div className="flex items-center">
                    {isHome ? (
                        <button
                            onClick={() => navigate?.("/")}
                            className="rounded-full p-2 hover:bg-muted transition-colors"
                        >
                            <Home className="h-5 w-5 text-foreground" />
                        </button>
                    ) : (
                        <button onClick={goBack} className="rounded-full p-2 hover:bg-muted transition-colors">
                            <ArrowLeft className="h-5 w-5 text-foreground" />
                        </button>
                    )}
                </div>

                {!isHome && (
                    <div className="flex-1 overflow-hidden px-2">
                        <span className={`block truncate text-center ${i18n.language === 'km' ? 'text-[14px]' : 'text-[12px]'} font-bold text-muted-foreground uppercase tracking-[0.2em]`}>
                            {stepTitle}
                        </span>
                    </div>
                )}

                {isHome && (
                    <div className="flex-1" />
                )}

                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted transition-colors text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                        <Languages className="h-4 w-4" />
                        {i18n.language.toUpperCase()}
                    </button>

                    <button
                        onClick={() => setShowCart(true)}
                        className="relative rounded-full p-2 hover:bg-muted transition-colors"
                    >
                        <ShoppingCart className="h-5 w-5 text-foreground" />
                        {cartLength > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                {cartLength}
                            </span>
                        )}
                    </button>

                    {isHome && (
                        <button
                            onClick={() => customer ? navigate?.("/account") : navigate?.("/auth")}
                            className="rounded-full p-2 hover:bg-muted transition-colors"
                        >
                            <User className="h-5 w-5 text-foreground" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StepHeader;
