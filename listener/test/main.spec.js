
const main = require('../api/main');
const req = {key:"<key>", requestObject: { DeviceId: '741506b0520fd0490360ca0-e111f01f0560-4970f60b30-13c190890be0-4c1104101a0ac0950aa06f03b07808f060',
	Parameters:
	{ Fields:
		[ 'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuW8JNDNPACdaXRs1t9Tz3B385X33n767g=',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuWN8NTUEn7mGvxuoaib6BhUN9G23/367jYARREYg==',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuWLYCcJU9PowdmEjWclPql7spX2Hvt',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuW+jRwzyofNN2B004p2BW+08pO/3X/6IHQFwlRdkzC',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuWV8O6P9azR1YnnwA5h/28e9tS3nP/8aXaChtcXEjFlYKR5C0=',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuWl8SjWWCmHZJ9NxBCUkLsl9pZyGXz4KLBFw==',
			'uP8ZfM9GngvYOjUD8Wn9p1d3eKI58TuWXGn6nMp/6GcZnTxAmzUGYtBZ33n47K/UEBNff1o=' ] },
	Request: 'q2swiEIHiaIoXVDMqjnoChqfLXhYschUoxVn0La6WpgIi8Gv7tely1NtOfUL',
		Timestamp: 1510252853364,
		Token: '<token>',
		UserEmail: 'muhc.app.mobile@gmail.com',
		UserID: 'B2kYsSepMNcKn5dR4AxskaHfyS02' }
};
main.apiRequestFormatter(req.key, req.requestObject).then((res)=>{
	console.log("HEL", res);
}).catch((err)=>{
	console.log("fucl");
});