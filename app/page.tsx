"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import LoginButton from "./components/LoginButton";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Gamepad2, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { data: session, status } = useSession();
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 backdrop-blur-sm">
            <Gamepad2 className="h-12 w-12 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-primary to-blue-500 bg-clip-text text-transparent">
                {t.landing.title}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.landing.subtitle}
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <LoginButton />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 max-w-3xl mx-auto">
            <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-semibold">{t.landing.feature1Title}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.landing.feature1Desc}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="inline-flex items-center justify-center p-2 rounded-lg bg-amber-500/10">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-semibold">{t.landing.feature2Title}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.landing.feature2Desc}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="inline-flex items-center justify-center p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="font-semibold">{t.landing.feature3Title}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.landing.feature3Desc}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{t.landing.poweredBy}</span>
        </div>
      </div>
    </main>
  );
}
