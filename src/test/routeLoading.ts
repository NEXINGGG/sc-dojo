import { screen, waitForElementToBeRemoved } from '@testing-library/react';

const routeLoadingStatus = { name: '画面を読み込んでいます' };

export async function waitForRouteLoadingToFinish(timeout = 5_000): Promise<void> {
  const loading = screen.queryByRole('status', routeLoadingStatus);
  if (loading !== null) {
    await waitForElementToBeRemoved(() => screen.queryByRole('status', routeLoadingStatus), {
      timeout,
    });
  }
}
