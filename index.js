
const username=process.argv[2];

 if(!username){
     console.error("Please provide a github username");
     process.exit(1);
 }

 //1. Function to format and print events
  
  function formatAndPrintEvents(events){

         events.forEach((event)=>{
              let action="";
               const repoName=event.repo?event.repo.name:"Unknown Repository";

                switch(event.type){
                    case "PushEvent":
                        const commitCount=event.payload.commits?event.payload.commits.length:0;
                        action=`Pushed ${commitCount} commit(s) to ${repoName}`;
                        break;
                    case "IssuesEvent":
                        action=`${event.payload.action.charAt(0).toUpperCase()+ event.payload.action.slice(1) } an issue in ${repoName}`;
                        break;
                    case "WatchEvent":
                        action=`Started ${repoName}`;
                        break;

                    case "ForkEvent":
                        action=`Forked ${repoName}`;
                        break;
                    case "CreateEvent":
                        action=`Created ${event.payload.ref_type} in ${repoName}`;
                        break;
                    default:
                        action=`${event.type.replace("Event","") } in ${repoName}`;
                        break;


                }
                console.log(`-${action} at ${new Date(event.created_at).toLocaleString()}`);
         });
  }


 //2 . Github API request function

 async function fetchGitHubActivity(user){
     const url=`https://api.github.com/users/${user}/events`;

      try{
         const response=await fetch(url,{
            headers:{
                "User-Agent":"node-github-activity-cli",
            }
         });
           if(response.status===404){
               console.error(`Error: User '${user}' not found.`);
               process.exit(1);
           }

           const events=await response.json();
           if(events.length===0){
              console.log(`No recent activity found for user '${user}'`);
              return;
           }
           //3. Format and display Activity
           console.log(`\nRecent Acitivity for ${user}:\n`);
           formatAndPrintEvents(events);
      }catch(error){
           console.error("Error fetching data:",error.message);
           process.exit(1);
      }
 }


 fetchGitHubActivity(username);