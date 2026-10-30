import { dashboardDemo } from './dashboard';

/** Typed first-use fixture, selected only by the development preview. */
export const emptyDashboardDemo: typeof dashboardDemo = {
  ...dashboardDemo, openingCashCentavos: 0, movements: [], sales: [], products: [],
  previousSalesCentavos: 0, activity: [],
};
