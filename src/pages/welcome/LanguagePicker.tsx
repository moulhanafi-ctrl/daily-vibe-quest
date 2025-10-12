import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

export default function LanguagePicker() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Update language in i18n
      await i18n.changeLanguage(selectedLanguage);

      // Update user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language: selectedLanguage })
          .eq('id', user.id);

        if (error) throw error;
      }

      // Navigate to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Error saving language:', error);
      toast.error('Failed to save language preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <Globe className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-4xl font-bold">Choose Your Language</h1>
          <p className="text-muted-foreground text-lg">
            Select your preferred language. You can change this anytime in Settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LANGUAGES.map((lang) => (
            <Card
              key={lang.code}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedLanguage === lang.code
                  ? 'border-primary border-2 bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedLanguage(lang.code)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <span className="text-5xl">{lang.flag}</span>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold">{lang.nativeName}</h3>
                  <p className="text-sm text-muted-foreground">{lang.name}</p>
                </div>
                {selectedLanguage === lang.code && (
                  <Check className="h-6 w-6 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
