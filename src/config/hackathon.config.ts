import type { HackathonConfig } from '../types';

export const HACKATHON_NAME = 'Hackathon';
export const HACKATHON_YEAR = '2026';
export const ORGANIZATION_NAME = 'University Innovation & Incubation Council';
export const UNIVERSITY_NAME = 'National Institute of Technology';

export const HACKATHON_CONFIG: HackathonConfig = {
  hackathonName: HACKATHON_NAME,
  hackathonYear: HACKATHON_YEAR,
  hackathonTagline: 'Building solutions for real-world challenges.',
  organizationName: ORGANIZATION_NAME,
  universityName: UNIVERSITY_NAME,
  edition: 'Annual National Edition',

  hero: {
    eyebrow: 'IDEAS  |  INNOVATION  |  IMPACT',
    headingPart1: 'INNOVATE.',
    headingPart2: 'BUILD.',
    headingHighlight: 'CREATE IMPACT.',
    supportingText:
      'Explore real-world problem statements, understand the challenges, and choose the problem your team wants to solve.',
    primaryCtaText: 'VIEW PROBLEM STATEMENTS →',
    secondaryCtaText: 'TEAM LOGIN',
  },

  statistics: [
    {
      id: 'stat-problems',
      value: '15+',
      label: 'Problem Statements',
      description: 'Curated by industry & faculty mentors',
    },
    {
      id: 'stat-teams',
      value: '100+',
      label: 'Teams',
      description: 'Shortlisted competitive innovators',
    },
    {
      id: 'stat-domains',
      value: '5+',
      label: 'Domains',
      description: 'Healthcare, AI, Agritech, Clean Energy, FinTech',
    },
    {
      id: 'stat-challenge',
      value: '01',
      label: 'Challenge',
      description: 'Per registered team to solve & defend',
    },
  ],

  navigationLinks: [
    { label: 'Home', href: '/' },
    { label: 'Problem Statements', href: '/participant/problems' },
    { label: 'Timeline', href: '#timeline' },
    { label: 'Guidelines', href: '#guidelines' },
    { label: 'Contact', href: '#contact' },
  ],

  howItWorksSteps: [
    {
      stepNumber: '01',
      title: 'LOGIN',
      description: 'Use the credentials provided by the hackathon organizers.',
    },
    {
      stepNumber: '02',
      title: 'EXPLORE',
      description: 'Browse the officially released problem statements.',
    },
    {
      stepNumber: '03',
      title: 'CHOOSE',
      description: 'Select one problem statement for your team.',
    },
  ],

  whyPortalFeatures: [
    {
      id: 'official-statements',
      title: 'OFFICIAL PROBLEM STATEMENTS',
      description: 'Access problem statements released directly by the hackathon organizers.',
      iconName: 'FileCheck',
    },
    {
      id: 'team-access',
      title: 'TEAM-BASED ACCESS',
      description: 'Every team receives secure credentials for accessing the portal.',
      iconName: 'ShieldCheck',
    },
    {
      id: 'one-challenge',
      title: 'ONE CLEAR CHALLENGE',
      description: 'Each team can eventually select one problem statement to work on.',
      iconName: 'Target',
    },
  ],

  releaseBanner: {
    title: 'PROBLEM STATEMENTS',
    description: 'Official challenges will appear here when released by the organizers.',
    status: 'COMING SOON',
    releaseDateText: 'Release Window: October 2026',
  },

  contactInformation: {
    email: 'hackathon-portal@university.edu',
    supportHours: '9:00 AM – 8:00 PM IST',
    venue: 'Campus Innovation Center, Hall A',
    dates: 'October 15–17, 2026',
  },
};
