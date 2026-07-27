import { apiClient } from '../../../shared/api/apiClient';
import { payrollRunApi } from './payrollRunApi';

jest.mock('../../../shared/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

describe('payrollRunApi', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('lists all payroll runs', async () => {
    mockedGet.mockResolvedValue([]);
    await payrollRunApi.list();
    expect(mockedGet).toHaveBeenCalledWith('/payroll-runs');
  });

  it('fetches a single payroll run by id', async () => {
    mockedGet.mockResolvedValue({ id: '1' });
    await payrollRunApi.getById('1');
    expect(mockedGet).toHaveBeenCalledWith('/payroll-runs/1');
  });

  it('creates a payroll run scoped to a pay period', async () => {
    mockedPost.mockResolvedValue({ id: '1', payPeriodId: '10', status: 'PENDING' });
    await payrollRunApi.create('10');
    expect(mockedPost).toHaveBeenCalledWith('/payroll-runs', { payPeriodId: '10' });
  });
});
