export type Role = "admin" | "cook";
export type DataMode = "live" | "demo";
export interface WorkspaceState {
  mode: DataMode;
  version: number;
  demoDate: string | null;
  today: string;
}
export interface WorkspaceSettings extends WorkspaceState {
  liveOrders: number;
  demoOrders: number;
}
export type OrderStatus = "new" | "cooking" | "ready";
export interface Identity {
  role: Role;
  login: string;
}
export interface ApplicationContext {
  user: Identity;
  today: string;
  timezone: string;
  csrfToken: string;
  workspace: WorkspaceState;
}
export interface CatalogEntry {
  id: string;
  name: string;
}
export interface Catalog {
  dishes: CatalogEntry[];
  groups: CatalogEntry[];
}
export interface Order {
  id: number;
  dishId: string;
  dish: string;
  groupId: string;
  group: string;
  quantity: number;
  serviceDate: string;
  servingTime: string;
  status: OrderStatus;
  createdAt: string;
  cookingAt: string | null;
  readyAt: string | null;
  createdBy: string;
}
export interface OrderEvent {
  id: number;
  status: OrderStatus;
  happenedAt: string;
  actor: string;
}
export interface OrderDetail {
  order: Order;
  events: OrderEvent[];
}
export interface Totals {
  planned: number;
  issued: number;
  orders: number;
  ready: number;
  cooking: number;
  fresh: number;
  cookingPortions: number;
  newPortions: number;
}
export interface Breakdown extends Totals {
  id: string;
  name: string;
}
export interface ChartPoint {
  key: string;
  label: string;
  issued: number;
}
export interface Scope {
  date: string;
  from: string;
  to: string;
  period: "day" | "week";
  timezone: string;
}
export interface Analytics {
  scope: Scope;
  totals: Totals;
  dishes: Breakdown[];
  groups: Breakdown[];
  chart: ChartPoint[];
  recent: Order[];
  updatedAt: string;
}
export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  totals: Totals;
  counts: { all: number; new: number; cooking: number; ready: number };
  scope: Scope;
}
export interface EntityAnalytics extends Analytics {
  entity: CatalogEntry;
  kind: "dish" | "group";
  orders: OrderPage;
}
export interface CreateOrder {
  dishName: string;
  groupName: string;
  quantity: number;
  serviceDate: string;
  servingTime: string;
}
