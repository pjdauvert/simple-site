export interface MenuItem {
  menuTitle: string;
  pageName: string;
  route: string;
}

export interface MenuConfig {
  items: MenuItem[];
}

