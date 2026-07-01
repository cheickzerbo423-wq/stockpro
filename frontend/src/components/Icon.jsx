// src/components/Icon.jsx
// Icônes professionnelles via lucide-react. On conserve l'API interne
// <Icon name="box" size={18} className="..." /> pour ne rien changer ailleurs :
// chaque "name" est associé à une icône lucide propre et cohérente.
import {
  Home, Package, Truck, Receipt, FileText, ShoppingCart, ShoppingBag, Building2, Factory,
  User, Users, Lock, Key, Shield, Crown, Fingerprint,
  Coins, BarChart3, TrendingUp, TrendingDown, Target, Hash,
  Check, X, Plus, Trash2, Pencil, Search, Eye, RefreshCw, Printer, Download, Ticket,
  ClipboardList, Pause, Play, Ban, Link2,
  AlertTriangle, Clock, Bell, Zap, Settings, Palette, Sparkles, Lightbulb, Rocket, Trophy,
  Inbox, Camera, Phone, Mail, MapPin, Smartphone, Infinity as InfinityIcon, Star,
  ArrowRight, ArrowUpRight, ArrowDown, ArrowUpDown, ChevronDown, ChevronUp,
} from "lucide-react";

const MAP = {
  // Navigation / objets
  home: Home, box: Package, truck: Truck, receipt: Receipt, file: FileText,
  cart: ShoppingCart, bag: ShoppingBag, building: Building2, factory: Factory,
  // Personnes / sécurité
  user: User, users: Users, lock: Lock, key: Key, shield: Shield, crown: Crown, fingerprint: Fingerprint,
  // Finance / data
  coins: Coins, chart: BarChart3, trendUp: TrendingUp, trendDown: TrendingDown, target: Target, hash: Hash,
  // Actions
  check: Check, x: X, plus: Plus, trash: Trash2, edit: Pencil, search: Search, eye: Eye,
  refresh: RefreshCw, printer: Printer, download: Download, ticket: Ticket, clipboard: ClipboardList,
  pause: Pause, play: Play, ban: Ban, link: Link2,
  // Statut / divers
  alert: AlertTriangle, clock: Clock, bell: Bell, bolt: Zap, settings: Settings, palette: Palette,
  sparkles: Sparkles, bulb: Lightbulb, rocket: Rocket, trophy: Trophy, inbox: Inbox,
  camera: Camera, phone: Phone, mail: Mail, pin: MapPin, device: Smartphone, infinity: InfinityIcon, star: Star,
  // Flèches
  arrowRight: ArrowRight, arrowUpRight: ArrowUpRight, arrowDown: ArrowDown, sort: ArrowUpDown,
  chevron: ChevronDown, chevronUp: ChevronUp,
};

export default function Icon({ name, size = 18, className = "", strokeWidth = 2, style }) {
  const Cmp = MAP[name] || Package;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
