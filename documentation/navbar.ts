import type { NavbarConfig } from '@vuepress/theme-default'
import { resolve } from 'path';
import { readdirSync } from 'fs';

export function getFiles(dir: string) {
  const base = resolve(__dirname, '../');
  return readdirSync(resolve(base, dir))
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .map(file => `/${ dir }/${ file }`);
}

export const navbar: NavbarConfig = [
      {
        text: 'Getting started',
        icon: 'fa-solid fa-circle-arrow-right',
        link: 'getting-started/',
      },
      {
        text: 'Config',
        icon: 'gears',
        link: 'configuration/'
      }
]