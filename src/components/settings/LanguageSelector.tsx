import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    setLoading(true);
    try {
      // Update language in i18n
      await i18n.changeLanguage(languageCode);

      // Update user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language: languageCode })
          .eq('id', user.id);

        if (error) throw error;
      }

      toast.success(t('settings.languageUpdated', 'Language updated successfully'));
      
      // Reload the page to apply RTL changes if needed
      if (languageCode === 'ar' || i18n.language === 'ar') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error(t('settings.languageUpdateFailed', 'Failed to update language'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('settings.language')}
        </CardTitle>
        <CardDescription>
          {t('settings.selectLanguage')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={i18n.language}
          onValueChange={handleLanguageChange}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};
