/** 
 * 
 * Description: Get files for given record ids. Simple script, almost no error handling.
 * Author: Prashanth Krishnamurthy, @crmcog
 * License: None
**/

var fetch = require('cross-fetch');

// replace these with real values. Refer https://crmcog.com/get-sfdc-attachments-using-REST-API
const sec = {
    userName:"...@gmail.com",
    secPassToken:"...",
    client_id:"client_id",
    client_secret:"client_secret"
};

const recordId = ['0031J00001DkSTHQA3']; //contact id


const authUrl = "https://login.salesforce.com/services/oauth2/token?grant_type=password&client_id="+ sec.client_id + "&client_secret=" + sec.client_secret + "&username="+sec.userName+ "&password=" + sec.secPassToken;

// authenticate
fetch(authUrl, {method: "POST"})
    .then(data => {return data.json()})
    .then(res => {
        console.log("Authentication successful. access_token: " + res.access_token + '; instance_url:' + res.instance_url);
        //get contact
        sec.access_token = res.access_token;
        sec.instance_url = res.instance_url;
        getContactAttachments(sec, recordId);
        return res;
    })
    .catch(error => {console.error("Authentication error: " + error)});


function getContactAttachments(sec, recordId){
    try{ 
        
        // create sub directories to store files
        const fs = require('fs');
        const dirTimePrefix = new Date().getTime();
        const dirName= __dirname + "\\sfdc-files-" + dirTimePrefix;

        if (!fs.existsSync(dirName)) fs.mkdirSync(dirName); 
        console.log("created/found directory: " + dirName);

        console.log('get attachment referencess associated with contact..');
        const getURL = sec.instance_url + "/services/data/v43.0/query?q=";
        sec.authHeader = {
            method: "GET",
            headers:{
                'Authorization':'Bearer ' + sec.access_token
            }
        }

        //https://<instance_url>/services/data/v43.0/query?q=select id, LinkedEntityId,ContentDocumentId from ContentDocumentLink where LinkedEntityId = '0031J00001DkSTHQA3'
        fetch(getURL+"select id, LinkedEntityId,ContentDocumentId from ContentDocumentLink where LinkedEntityId='" + recordId[0] + "'", sec.authHeader)
        .then(data => {return data.json()})
        .then(res => {
            console.log("Contact '" + recordId[0] + "' has " + res.totalSize + " attachments");
            if (parseInt(res.totalSize, 10) > 0){

                //get all ContentDocumentIds in the result. This will have all the attachment references from ContentDocumentLink
                var contentDocumentIds = res.records.map(docId => "ContentDocumentId = '"+ docId.ContentDocumentId + "'");

                //https://<instance_url>/services/data/v43.0/query?q=SELECT VersionData FROM ContentVersion WHERE (ContentDocumentId  = '0691J000004Md1DQAS' or ContentDocumentId  = '0691J000004Me8yQAC' or ContentDocumentId  = '0691J000004Me93QAC') AND IsLatest = true
                fetch(getURL + "SELECT Id, Title, FileExtension, VersionData FROM ContentVersion WHERE (" + contentDocumentIds.join(' OR ') + ") AND IsLatest = true", sec.authHeader)
                .then(dataVersion => {return dataVersion.json()})
                .then(resVersion => {
                    console.log("Validating attachments.. found " + resVersion.totalSize + " attachments. Fetching them now..");
                    if (parseInt(resVersion.totalSize, 10) > 0){
                        var contentVersions = resVersion.records.map(contentVersion => dirName + "\\" + contentVersion.Title + "_" +contentVersion.Id + "." + contentVersion.FileExtension + "/\\/\\" + contentVersion.VersionData);
                        contentVersions.map(contentVersion => {getAttachment(sec, contentVersion)});
                    }
                })
                .catch(error => {console.error("getVersionData fetch error: " + error)});

    
            }
        })
        .catch(error => {console.error("getContactAttachments fetch error: " + error)});

    }

    catch(e){
        console.error("getContactAttachments error: " + e.toString());
    }

}

function getAttachment(sec, contentVersion){
    fileURL = contentVersion.split("/\\/\\");
    console.log('getting attachment ..' + sec.instance_url + contentVersion.split("/\\/\\")[1]);
    fetch(sec.instance_url + contentVersion.split("/\\/\\")[1], sec.authHeader)
    .then(dataAttach => {return dataAttach.buffer()})      
    .then(fileBuffer => {
        var fs = require ('fs');
        fs.writeFileSync(contentVersion.split("/\\/\\")[0], fileBuffer);
        console.log("file saved.. " + contentVersion.split("/\\/\\")[0]);
    })            
    .catch(error => {console.error("getAttachment fetch error: " + error)});

}
