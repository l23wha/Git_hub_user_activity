
 const fs=require('fs');
 const path=require('path');

 //1. Arguments and flags parsing
 const args=process.argv.slice(2);
 const username=args.find(arg=>!arg.startsWith('--'));

 // Flags support: -- type push events,--limit=10 ,no cache
 const typeFlag=args.find(arg=>arg.startsWith('--type='))?.split('=')[1];
 const limitFlag=parseInt(args.find(arg=>arg.startsWith('--limit='))?.split('=')[1])||10;
 const bypassCache=args.includes('--no-cache');

 //2. Validate username
 if(!username){ 
    console.log('Please provide a GitHub username');
    process.exit(1);
 }

 const CACHE_FILE=path.join(__dirname,`.cache_${username}.json`);
 const CACHE_TTL_MS=5*60*1000; // 5 minutes

 // Formating and printing function

 function formatAndPrintEvents(events){
     
    let filteredEvents=events;

    //Filter by type if flag provided

    if(typeFlag){
        filteredEvents=events.filter(event=>event.type.toLowerCase()===typeFlag.toLowerCase());
    }

    //Limit output count
     filteredEvents=filteredEvents.slice(0,limitFlag);
    if(filteredEvents.length===0){
         console.log('No events found for the specified criteria');
         return;
    }

    filteredEvents.forEach((event)=>{
        let action="";
         const repoName=event.repo?event.repo.name:"Uknown Repository";

          switch(event.type){
               case "PushEvent":
                const commitCount = event.payload.commits ? event.payload.commits.length : 0;
                action = `Pushed \x1b[32m${commitCount} commit(s)\x1b[0m to \x1b[36m${repoName}\x1b[0m`;
                break;
            case "IssuesEvent":
                const issueAction = event.payload.action;
                action = `\x1b[33m${issueAction.charAt(0).toUpperCase() + issueAction.slice(1)}\x1b[0m an issue in \x1b[36m${repoName}\x1b[0m`;
                break;
            case "WatchEvent":
                action = `Starred \x1b[35m${repoName}\x1b[0m`;
                break;
            case "ForkEvent":
                action = `Forked \x1b[36m${repoName}\x1b[0m to \x1b[32m${event.payload.forkee?.full_name || 'fork'}\x1b[0m`;
                break;
            case "CreateEvent":
                action = `Created \x1b[32m${event.payload.ref_type}\x1b[0m in \x1b[36m${repoName}\x1b[0m`;
                break;
            case "PullRequestEvent":
                action = `\x1b[34m${event.payload.action.toUpperCase()}\x1b[0m PR #${event.payload.number} in \x1b[36m${repoName}\x1b[0m`;
                break;
            default:
                action = `${event.type.replace("Event", "")} in \x1b[36m${repoName}\x1b[0m`;
                break;
              


          };
          const dateStr=new Date(event.created_at).toLocaleDateString()+" "+new Date(event.created_at).toLocaleTimeString();
          console.log(`\x1b[33m${dateStr}\x1b[0m - ${action}`);
    });





 }

 // carche helpers

 function getCachedData(){
     
      if(bypassCache || !fs.existsSync(CACHE_FILE)){
        return null;
      }

        try{
             const cacheRaw=fs.readFileSync(CACHE_FILE,'utf-8');
              const cache=JSON.parse(cacheRaw);
               if(Date.now()-cache.timestamp<CACHE_TTL_MS){
                    return cache.data;
               }
        }catch(e){
            return null;
        }
        return null;
 }


 //
  function setCacheData(data){
       try{
           fs.writeFileSync(CACHE_FILE,JSON.stringify({
                timestamp:Date.now(),
                data:data
           }));
       }catch(e){
           
       }
  }

  // Fetcher function
  async function fetchGitHubEvents(user){

          const cachedEvents=getCachedData();
           if(cachedEvents){
                console.log(`\n\x1b[34mRecent Activity for ${user} (from local cache):\x1b[0m\n`);
                formatAndPrintEvents(cachedEvents);
                return;
           }

            const url=`https://api.github.com/users/${user}/events`;
             try{
                 const response=await fetch(url,{
                    headers:{
                        "User-agent":"node-github-activity-cli",
                        "Accept":"application/vnd.github.v3+json"
                    }
                 });
                  if(response.status===404){
                    console.log(`User ${user} not found`);
                    return;
                  }
                  if(response.status===403){
                      console.log("API rate limit exceeded. Please try again later or use authentication.");
                      return;
                  }
                  if(!response.ok){
                      console.log(`Error fetching data: ${response.status} ${response.statusText}`);
                      return;
                  }

                  const events=await response.json();
                  if(events.length===0){
                       console.log(`No recent activity found for user ${user}`);
                          return;
                  }
                   setCacheData(events);
                   console.log(`\n\x1b[34mRecent Activity for ${user}:\x1b[0m\n`);
                   formatAndPrintEvents(events);
             }catch(e){
                console.log(`Error fetching data: ${e.message}`);
                process.exit(1);
             }
  }

  fetchGitHubEvents(username);