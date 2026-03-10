import { CustomerService } from '../../services/crm/customer.service';

const customerService = new CustomerService();

export interface FetchCustomerArgs {
  phone: string;
}

export const fetchCustomer = async (args: FetchCustomerArgs) => {
  const customer = await customerService.getOrCreateByPhone(args.phone);
  return customer;
};

