import type { CategoryType } from "@prisma/client";

export type SeedCategory = {
  name: string;
  /** Explicit only where auto-slugging would collide across dimensions. */
  slug?: string;
  description?: string;
  icon?: string;
  featured?: boolean;
  showOnHomepage?: boolean;
  children?: SeedCategory[];
};

export type SeedGroup = {
  categoryType: CategoryType;
  items: SeedCategory[];
};

/**
 * Starting taxonomy. Everything here is ordinary data — admins create, rename,
 * re-parent, reorder, deactivate and delete these from Admin -> Categories.
 * Nothing in the frontend hard-codes a category.
 */
export const CATEGORY_SEED: SeedGroup[] = [
  {
    categoryType: "OPPORTUNITY_TYPE",
    items: [
      {
        name: "Grants",
        icon: "Banknote",
        featured: true,
        showOnHomepage: true,
        description:
          "Non-dilutive startup funding. Money awarded to build, prove or commercialise something, with no equity taken in return.",
        children: [
          { name: "Government Grants" },
          { name: "Innovation Grants" },
          { name: "Prototype Grants" },
          { name: "Commercialisation Grants" },
          { name: "R&D Grants" },
          { name: "Research Grants" },
          { name: "Technology Grants" },
        ],
      },
      {
        name: "Seed Funds",
        icon: "Sprout",
        featured: true,
        showOnHomepage: true,
        description:
          "Early-stage investment and seed capital for startups with a working product or first customers.",
        children: [
          { name: "Seed Investment" },
          { name: "Pre-Seed Funding" },
          { name: "Angel-backed Programs" },
          { name: "Government Seed Funds" },
          { name: "Incubator Seed Funds" },
        ],
      },
      {
        name: "Incubation Programs",
        icon: "Building2",
        featured: true,
        showOnHomepage: true,
        description:
          "Structured startup development programmes run by incubators, universities, institutions and innovation centres.",
        children: [
          { name: "Pre-Incubation", slug: "pre-incubation-programs" },
          { name: "Incubation" },
          { name: "University Incubation" },
          { name: "Technology Incubation" },
          { name: "Sector-specific Incubation" },
          { name: "Virtual Incubation" },
        ],
      },
      {
        name: "Acceleration Programs",
        icon: "Rocket",
        featured: true,
        showOnHomepage: true,
        description:
          "Time-bound programmes built to help startups scale quickly, usually with funding, mentoring and customer access.",
        children: [
          { name: "Startup Accelerator" },
          { name: "Corporate Accelerator" },
          { name: "International Accelerator" },
          { name: "Sector Accelerator" },
          { name: "Growth Accelerator" },
          { name: "Market Access Accelerator" },
        ],
      },
      {
        name: "CSR Funding",
        icon: "HeartHandshake",
        featured: true,
        description:
          "Funding and startup programmes supported through corporate social responsibility budgets.",
        children: [
          { name: "CSR Grants" },
          { name: "CSR Innovation Challenges" },
          { name: "Social Enterprise Funding" },
          { name: "Sustainability Programs" },
          { name: "Livelihood Programs" },
          { name: "Impact Startup Programs" },
          { name: "Social Impact", slug: "csr-social-impact" },
          { name: "Sustainability", slug: "csr-sustainability" },
          { name: "Education", slug: "csr-education" },
          { name: "Healthcare", slug: "csr-healthcare" },
          { name: "Livelihood", slug: "csr-livelihood" },
        ],
      },
      {
        name: "Corporate Innovation",
        icon: "Handshake",
        featured: true,
        description:
          "Opportunities offered by corporates: open innovation calls, challenges, pilots and collaboration programmes.",
        children: [
          { name: "Open Innovation" },
          { name: "Corporate Challenges" },
          { name: "Startup Collaboration Programs" },
          { name: "Proof-of-Concept Programs" },
          { name: "Vendor Innovation Programs" },
          { name: "Pilot Programs" },
          { name: "Startup Challenge" },
        ],
      },
      {
        name: "Awards & Competitions",
        icon: "Trophy",
        featured: true,
        description:
          "Competition-based funding and recognition, including cash-prize contests and pitch events.",
        children: [
          { name: "Startup Awards" },
          { name: "Innovation Awards" },
          { name: "Startup Competitions" },
          { name: "Pitch Competitions" },
          { name: "Hackathons" },
          { name: "Challenge Grants" },
          { name: "Cash Prize Competitions" },
        ],
      },
      {
        name: "Fellowships",
        icon: "GraduationCap",
        description:
          "Founder and entrepreneur fellowships, usually combining a stipend with mentorship and a cohort.",
        children: [
          { name: "Entrepreneur in Residence" },
          { name: "Founder Fellowship" },
          { name: "Innovation Fellowship" },
          { name: "Research Fellowship" },
          { name: "Entrepreneurship Fellowship" },
          { name: "Social Innovation Fellowship" },
        ],
      },
      {
        name: "Subsidies",
        icon: "Receipt",
        description:
          "Government or institutional financial support that reimburses or reduces a specific cost.",
        children: [
          { name: "Capital Subsidy" },
          { name: "Technology Subsidy" },
          { name: "Export Subsidy" },
          { name: "Manufacturing Subsidy" },
          { name: "Patent Subsidy" },
          { name: "Certification Subsidy" },
        ],
      },
      {
        name: "Debt & Loans",
        icon: "Landmark",
        description: "Non-equity startup financing repaid over time.",
        children: [
          { name: "Startup Loans" },
          { name: "Soft Loans" },
          { name: "Government Loans" },
          { name: "Credit Guarantee Programs" },
          { name: "Working Capital" },
          { name: "Venture Debt" },
        ],
      },
      {
        name: "Equity Funding",
        icon: "TrendingUp",
        description: "Investment where the investor receives equity.",
        children: [
          { name: "Pre-Seed Investment" },
          { name: "Angel Investment" },
          { name: "Venture Capital Programs" },
          { name: "Government Equity Funds" },
        ],
      },
      {
        name: "Innovation Challenges",
        icon: "Target",
        description:
          "Published problem statements that startups can apply to solve.",
        children: [
          { name: "Government Challenges" },
          { name: "Industry Challenges" },
          { name: "Technology Challenges" },
          { name: "Grand Challenges" },
        ],
      },
      {
        name: "Pilot Opportunities",
        icon: "FlaskConical",
        featured: true,
        description:
          "Programmes where startups test their technology with a corporate, government body or institution.",
        children: [
          { name: "Paid Pilot" },
          { name: "Proof of Concept" },
          { name: "Technology Demonstration" },
          { name: "Industrial Pilot" },
          { name: "Government Pilot" },
          { name: "Corporate Pilot" },
        ],
      },
      {
        name: "Market Access Programs",
        icon: "Globe",
        description:
          "Programmes that help startups reach new customers or new markets.",
        children: [
          { name: "International Market Access" },
          { name: "Export Programs" },
          { name: "Soft Landing Programs" },
          { name: "Corporate Buyer Programs" },
          { name: "Trade Missions" },
          { name: "Startup Delegations" },
        ],
      },
      {
        name: "International Programs",
        icon: "Plane",
        featured: true,
        description:
          "Funding and startup support available outside the startup's home country.",
        children: [
          { name: "International Grants" },
          { name: "Cross-Border Accelerators" },
          { name: "Global Challenges" },
          { name: "International Innovation Programs" },
        ],
      },
      {
        name: "Research & Development Funding",
        slug: "rnd-funding",
        icon: "Microscope",
        description:
          "Funding directed at technology development, research and deep technical work.",
        children: [
          { name: "University Collaboration" },
          { name: "Research Commercialisation" },
          { name: "Technology Development" },
          { name: "Prototype Development" },
          { name: "DeepTech Funding" },
        ],
      },
      {
        name: "Procurement Opportunities",
        icon: "ClipboardList",
        description:
          "Government or corporate routes for a startup to become a supplier.",
        children: [
          { name: "Government Procurement" },
          { name: "Startup Procurement" },
          { name: "Corporate Procurement" },
          { name: "Innovation Procurement" },
          { name: "Public Sector Challenges" },
        ],
      },
      {
        name: "Sustainability & Impact Funding",
        slug: "sustainability-impact-funding",
        icon: "Leaf",
        description:
          "Funding focused on social and environmental impact outcomes.",
        children: [
          { name: "Climate Funding" },
          { name: "Circular Economy", slug: "circular-economy-funding" },
          { name: "Clean Energy", slug: "clean-energy-funding" },
          { name: "Social Enterprise", slug: "social-enterprise-programs" },
          { name: "SDG Programs" },
          { name: "Impact Grants" },
        ],
      },
    ],
  },
  {
    categoryType: "INDUSTRY",
    items: [
      { name: "Artificial Intelligence", featured: true },
      { name: "DeepTech", featured: true },
      { name: "SaaS" },
      { name: "Manufacturing", featured: true },
      { name: "Industry 4.0" },
      { name: "Robotics" },
      { name: "Automation" },
      { name: "Mobility" },
      { name: "Electric Vehicles" },
      { name: "ClimateTech", featured: true },
      { name: "CleanTech" },
      { name: "Energy" },
      { name: "Renewable Energy" },
      { name: "Circular Economy" },
      { name: "Sustainability" },
      { name: "BioTech" },
      { name: "HealthTech", featured: true },
      { name: "MedTech" },
      { name: "AgriTech", featured: true },
      { name: "FoodTech" },
      { name: "FinTech" },
      { name: "EdTech" },
      { name: "Cybersecurity" },
      { name: "SpaceTech" },
      { name: "Defence" },
      { name: "Semiconductor" },
      { name: "Electronics" },
      { name: "Materials" },
      { name: "Construction" },
      { name: "Logistics" },
      { name: "Supply Chain" },
      { name: "Retail" },
      { name: "D2C" },
      { name: "Consumer" },
      { name: "Web3" },
      { name: "Social Impact" },
      { name: "Rural Innovation" },
      { name: "Water" },
      { name: "Waste Management" },
      { name: "Agriculture" },
      { name: "Blue Economy" },
      { name: "Tourism" },
      { name: "Creative Industries" },
    ],
  },
  {
    categoryType: "STARTUP_STAGE",
    items: [
      { name: "Idea Stage", slug: "idea-stage" },
      { name: "Pre-Incubation" },
      { name: "Prototype" },
      { name: "Proof of Concept", slug: "proof-of-concept-stage" },
      { name: "MVP" },
      { name: "Pre-Revenue" },
      { name: "Early Revenue" },
      { name: "Seed", slug: "seed-stage" },
      { name: "Growth" },
      { name: "Scale-Up" },
    ],
  },
  {
    categoryType: "FOUNDER_TYPE",
    items: [
      { name: "Women Founders", featured: true },
      { name: "Student Founders" },
      { name: "Young Entrepreneurs" },
      { name: "Researchers" },
      { name: "University Spinouts" },
      { name: "First-Time Founders" },
      { name: "Social Entrepreneurs" },
      { name: "Rural Entrepreneurs" },
    ],
  },
  {
    categoryType: "PROVIDER_TYPE",
    items: [
      { name: "Government" },
      { name: "State Government" },
      { name: "Central Government" },
      { name: "University", slug: "university-provider" },
      { name: "Incubator" },
      { name: "Accelerator" },
      { name: "Corporate" },
      { name: "Foundation" },
      { name: "NGO" },
      { name: "International Organisation" },
      { name: "Investor" },
      { name: "Venture Capital" },
      { name: "Angel Network" },
      { name: "Industry Association" },
    ],
  },
  {
    categoryType: "GEOGRAPHY",
    items: [
      { name: "Pan India", featured: true },
      { name: "International", slug: "international-geography" },
      { name: "Remote" },
      {
        name: "Indian States",
        slug: "indian-states",
        description: "State and union territory specific opportunities.",
        children: [
          { name: "Andhra Pradesh" },
          { name: "Arunachal Pradesh" },
          { name: "Assam" },
          { name: "Bihar" },
          { name: "Chhattisgarh" },
          { name: "Goa" },
          { name: "Gujarat" },
          { name: "Haryana" },
          { name: "Himachal Pradesh" },
          { name: "Jharkhand" },
          { name: "Karnataka" },
          { name: "Kerala" },
          { name: "Madhya Pradesh" },
          { name: "Maharashtra" },
          { name: "Manipur" },
          { name: "Meghalaya" },
          { name: "Mizoram" },
          { name: "Nagaland" },
          { name: "Odisha" },
          { name: "Punjab" },
          { name: "Rajasthan" },
          { name: "Sikkim" },
          { name: "Tamil Nadu" },
          { name: "Telangana" },
          { name: "Tripura" },
          { name: "Uttar Pradesh" },
          { name: "Uttarakhand" },
          { name: "West Bengal" },
          { name: "Andaman and Nicobar Islands" },
          { name: "Chandigarh" },
          { name: "Dadra and Nagar Haveli and Daman and Diu" },
          { name: "Delhi" },
          { name: "Jammu and Kashmir" },
          { name: "Ladakh" },
          { name: "Lakshadweep" },
          { name: "Puducherry" },
        ],
      },
    ],
  },
];
