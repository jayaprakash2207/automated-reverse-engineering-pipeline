import { apiClient } from '../../../shared/api/apiClient';
import { payPeriodApi } from './payPeriodApi';

jest.mock('../../../shared/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('payPeriodApi', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('lists all pay periods from the v1 pay-periods resource', async () => {
    mockedGet.mockResolvedValue([]);
    await payPeriodApi.list();
    expect(mockedGet).toHaveBeenCalledWith('/pay-periods');
  });

  it('filters by status using a query parameter', async () => {
    mockedGet.mockResolvedValue([]);
    await payPeriodApi.list('CLOSED');
    expect(mockedGet).toHaveBeenCalledWith('/pay-periods?status=CLOSED');
  });

  it('fetches a single pay period by id', async () => {
    mockedGet.mockResolvedValue({ id: '1' });
    await payPeriodApi.getById('1');
    expect(mockedGet).toHaveBeenCalledWith('/pay-periods/1');
  });
});
