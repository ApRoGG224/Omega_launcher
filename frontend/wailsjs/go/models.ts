export namespace main {
	
	export class Version {
	    id: string;
	    type: string;
	    url: string;
	    time: string;
	    releaseTime: string;
	
	    static createFrom(source: any = {}) {
	        return new Version(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.url = source["url"];
	        this.time = source["time"];
	        this.releaseTime = source["releaseTime"];
	    }
	}

}

