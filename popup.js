document.getElementById('extractButton').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    
    statusDiv.textContent = "Finding Reddit tabs...";
    statusDiv.style.backgroundColor = "#FFF3E0";
    progressContainer.style.display = "block";
    
    try {
      const tabs = await chrome.tabs.query({url: "*://*.reddit.com/*"});
      
      if (tabs.length === 0) {
        statusDiv.textContent = "No Reddit tabs found. Please open Reddit posts in tabs first.";
        statusDiv.style.backgroundColor = "#FFEBEE";
        progressContainer.style.display = "none";
        return;
      }
      
      statusDiv.textContent = `Found ${tabs.length} Reddit tabs. Processing...`;
      
      let processedCount = 0;
      let allPosts = [];
      
      for (const tab of tabs) {
        try {
          if (tab.url.includes('/comments/')) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: extractRedditPostContent
            });
            
            if (results && results[0] && results[0].result) {
              allPosts.push(results[0].result);
            }
          }
          
          processedCount++;
          const progress = Math.floor((processedCount / tabs.length) * 100);
          progressBar.style.width = `${progress}%`;
          statusDiv.textContent = `Processing... ${processedCount}/${tabs.length} tabs`;
        } catch (error) {
          console.error(`Error processing tab ${tab.url}:`, error);
        }
      }
      
      if (allPosts.length > 0) {
        const blob = new Blob([JSON.stringify(allPosts, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
          url: url,
          filename: `reddit_posts_${new Date().toISOString().split('T')[0]}.json`,
          saveAs: true
        });
        
        statusDiv.textContent = `Successfully extracted ${allPosts.length} posts!`;
        statusDiv.style.backgroundColor = "#E8F5E9";
      } else {
        statusDiv.textContent = "No Reddit posts found in the open tabs.";
        statusDiv.style.backgroundColor = "#FFEBEE";
      }
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.backgroundColor = "#FFEBEE";
    }
    
    progressContainer.style.display = "none";
  });
  
  function extractRedditPostContent() {
    try {
      const titleElement = document.querySelector('h1');
      const title = titleElement ? titleElement.textContent.trim() : "Unknown Title";
      
      const url = window.location.href;
      
      const postId = url.includes('/comments/') ? 
        url.split('/comments/')[1].split('/')[0] : 
        "unknown";
      
      const subredditElement = document.querySelector('a[href^="/r/"]');
      const subreddit = subredditElement ? 
        subredditElement.textContent.trim() : 
        "Unknown Subreddit";
      
      
      const authorElement = document.querySelector('a[href^="/user/"]');
      const author = authorElement ? 
        authorElement.textContent.trim() : 
        "Unknown Author";
      
      
      let content = "";
     
      const selector = 'div[slot="text-body"] div';
      
      const contentElement = document.querySelector(selector);
      if (contentElement) {
        if (contentElement.tagName === 'IMG') {
            content = contentElement.src;
          } else {
            content = contentElement.textContent.trim();
          }
      }
      
      
      const comments = [];
      const commentElements = document.querySelectorAll('shreddit-comment');
      
      commentElements.forEach(comment => {
        const commentAuthorElement = comment.querySelector('a[href^="/user/"]');
        const commentAuthor = commentAuthorElement ? 
          commentAuthorElement.textContent.trim() : 
          "Unknown User";
        
        const commentContentElement = comment.querySelector('div[slot="comment"]');
        const commentContent = commentContentElement ? 
          commentContentElement.textContent.trim() : 
          "";
        
        if (commentContent) {
          comments.push({
            author: commentAuthor,
            content: commentContent
          });
        }
      });
      
      const timestamp = new Date().toISOString();
      
      return {
        title,
        url,
        postId,
        subreddit,
        author,
        content,
        comments: comments.slice(0, 50),
        extractedAt: timestamp
      };
    } catch (error) {
      console.error('Error extracting post content:', error);
      return {
        error: error.message,
        url: window.location.href
      };
    }
  }