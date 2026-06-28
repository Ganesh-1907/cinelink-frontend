const MSG91_AUTH_KEY = '536963A6XQkh2YqnN6a345886P1';
const MSG91_TEMPLATE_ID = '6a34597a02ea3e8bd205a614';

export const sendOTP = async (mobile: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=91${mobile}&authkey=${MSG91_AUTH_KEY}`,
      {method: 'GET'},
    );
    const data = await res.json();
    return data.type === 'success';
  } catch {
    return false;
  }
};

export const verifyOTP = async (mobile: string, otp: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?mobile=91${mobile}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`,
      {method: 'GET'},
    );
    const data = await res.json();
    return data.type === 'success';
  } catch {
    return false;
  }
};

export const resendOTP = async (mobile: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://control.msg91.com/api/v5/otp/retry?mobile=91${mobile}&authkey=${MSG91_AUTH_KEY}&retrytype=text`,
      {method: 'GET'},
    );
    const data = await res.json();
    return data.type === 'success';
  } catch {
    return false;
  }
};
