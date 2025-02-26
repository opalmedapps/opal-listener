// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/***
 * @class Queue
 * @description Implements standard queue
 */
class Queue {

	constructor() {
		this.array = [];
		this.head = 0;
	}
	isEmpty()
	{
		if(this.head === 0)
		{
			return true;
		}else{
			return false;
		}
	}
	size()
	{
		return this.array.length;
	};
	enqueueArray(arr)
	{
		if(arr.constructor === Array)
		{
			arr.forEach((item)=>{
				this.array.push(item);
				this.head++;
			});
		}
	}
	enqueue(field)
	{
		this.array.push(field);
		this.head++;
	};
	dequeue()
	{
		if(this.head !== 0)
		{
			this.head--;
			var poppedElement = this.array[0];
			this.array.splice(0,1);
			return poppedElement;
		}else{
			throw new Error('Attempting to dequeue empty queue');
		}
	};

}


/**
 * @class OpalQueue
 * @extends Queue
 * @description Contains inProgress variable
 */
class OpalQueue extends Queue {
	constructor(){
		super();
		this.inProgress = false;
	}
}
/**
 * @namespace OpalQueue module
 * @description Implements functionality for handling requests
 */
exports = module.exports = {
	OpalQueue
};
