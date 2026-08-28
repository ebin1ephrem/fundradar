"use client";

import {
  Award, Banknote, Beaker, Bike, Bot, Briefcase, Building2, Bus, Car,
  CircleDollarSign, Circle, ClipboardList, Cpu, CreditCard, Database, Droplets,
  Factory, FlaskConical, Gavel, Gift, Globe, GraduationCap, Handshake,
  HeartHandshake, HeartPulse, Landmark, Layers, Leaf, Lightbulb, LineChart,
  Medal, Microscope, Package, PiggyBank, Plane, Recycle, Rocket, Satellite,
  Scale, ScrollText, Share2, Shield, ShoppingBag, Sparkles, Sprout, Star, Sun,
  Target, Tractor, TrendingUp, Trophy, Truck, Users, Wallet, Wheat, Wind, Wrench, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * Category icons are admin-entered data, so they are resolved by name at render
 * time. The registry is explicit rather than a namespace import — a barrel
 * import of the whole icon set added ~250 kB to every page that renders one.
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Award, Banknote, Beaker, Bike, Bot, Briefcase, Building2, Bus, Car,
  CircleDollarSign, Circle, ClipboardList, Cpu, CreditCard, Database, Droplets,
  Factory, FlaskConical, Gavel, Gift, Globe, GraduationCap, Handshake,
  HeartHandshake, HeartPulse, Landmark, Layers, Leaf, Lightbulb, LineChart,
  Medal, Microscope, Package, PiggyBank, Plane, Recycle, Rocket, Satellite,
  Scale, ScrollText, Share2, Shield, ShoppingBag, Sparkles, Sprout, Star, Sun,
  Target, Tractor, TrendingUp, Trophy, Truck, Users, Wallet, Wheat, Wind, Wrench, Zap,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY).sort();

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = (name && ICON_REGISTRY[name]) || Circle;
  return <Cmp className={cn("size-4", className)} strokeWidth={strokeWidth} />;
}
