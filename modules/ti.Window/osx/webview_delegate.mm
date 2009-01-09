/**
 * Appcelerator Titanium - licensed under the Apache Public License 2
 * see LICENSE in the root folder for details on the license.
 * Copyright (c) 2008 Appcelerator, Inc. All Rights Reserved.
 */
#import "../../ti.App/app_config.h"
#import "webview_delegate.h"
#import "native_window.h"
#import "osx_user_window.h"

#define TRACE  NSLog

@interface NSApplication (DeclarationStolenFromAppKit)
- (void)_cycleWindowsReversed:(BOOL)reversed;
@end

@implementation WebViewDelegate

- (void)setup 
{
	AppConfig *appConfig = AppConfig::Instance();
	NSString *appID = [NSString stringWithCString:appConfig->GetAppID().c_str()];
	
	[webView setPreferencesIdentifier:appID];
	
	WebPreferences *webPrefs = [[WebPreferences alloc] initWithIdentifier:appID];
	// This indicates that WebViews in this app will not browse multiple pages, but rather show a small number.
	// this reduces memory cache footprint significantly.

	[webPrefs setCacheModel:WebCacheModelDocumentBrowser];

	[webPrefs setPlugInsEnabled:YES]; // ?? this disallows Flash content
	[webPrefs setJavaEnabled:NO]; // ?? this disallows Java Craplets
	[webPrefs setJavaScriptEnabled:YES];
	[webView setPreferences:webPrefs];

	[webPrefs release];

	// this stuff adjusts the webview/window for chromeless windows.
	WindowConfig *o = [window config];
	
	if (o->IsUsingScrollbars())
	{
		[[[webView mainFrame] frameView] setAllowsScrolling:YES];
	}
	else
	{
		[[[webView mainFrame] frameView] setAllowsScrolling:NO];
	}
	if (o->IsResizable() && !o->IsUsingChrome())
	{
		[window setShowsResizeIndicator:YES];
	}
	else
	{
		[window setShowsResizeIndicator:NO];
	}
	
	[webView setAutoresizingMask:NSViewHeightSizable | NSViewWidthSizable];
	[webView setShouldCloseWithWindow:NO];
}

-(id)initWithWindow:(NativeWindow*)win host:(Host*)h
{
	self = [super init];
	if (self!=nil)
	{
		window = win;
		host = h;
		KR_ADDREF(host);
		webView = [window webView];
		[self setup];
		[webView setFrameLoadDelegate:self];
		[webView setUIDelegate:self];
		[webView setResourceLoadDelegate:self];
		[webView setPolicyDelegate:self];
		[webView setScriptDebugDelegate:self];
		
		TRACE(@"webview_delegate::initWithWindow = %x",win);
	}
	return self;
}

-(void)dealloc
{
	KR_DECREF(host);
	[super dealloc];
}

-(void)show
{
	WindowConfig *config = [window config];
	config->SetVisible(true);
    [window makeKeyAndOrderFront:nil];	
}

-(void)closePrecedent
{
}

- (NSURL *)url
{
    return url;
}

-(void)setURL:(NSURL*)newURL
{
	TRACE(@"setURL: %@ called for %x",newURL,self);
	[url release];
	url = [newURL copy];
}

-(DOMElement*)findAnchor:(DOMNode*)node
{
	while (node)
	{
		if ([node nodeType] == 1 && [[node nodeName] isEqualToString:@"A"])
		{
			return (DOMElement*)node;
		}
		node = [node parentNode];
	}
	return nil;
}

-(BOOL)newWindowAction:(NSDictionary*)actionInformation request:(NSURLRequest*)request listener:(id < WebPolicyDecisionListener >)listener
{
	NSDictionary* elementDick = [actionInformation objectForKey:WebActionElementKey];
#ifdef DEBUG	
	for (id key in elementDick)
	{
		NSLog(@"window action - key = %@",key);
	}
#endif 
	DOMNode *target = [elementDick objectForKey:WebElementDOMNodeKey];
	DOMElement *anchor = [self findAnchor:target];
	
	TRACE(@"newWindowAction target=%@, anchor=%@",target,anchor);
	
	if (anchor)
	{
		NSString *target = [anchor getAttribute:@"target"];
		if (target)
		{
			if ([target isEqualToString:@"ti:systembrowser"])
			{
				NSURL *newURL = [request URL];
				[[NSWorkspace sharedWorkspace] openURL:newURL];
				[listener ignore];
				return NO;
			}
		}
	}

	NSString *protocol = [[actionInformation objectForKey:WebActionOriginalURLKey] scheme]; 
	NSURL *newURL = [request URL];
	if ([newURL isEqual:url])
	{
		[listener use];
		return NO;
	}
	
	if ([protocol isEqual:@"app"])
	{
		
		// if ([[TiController instance] shouldOpenInNewWindow])
		// {
		// 	// if we're trying to open an internal page, we essentially need to always open a 
		// 	// new document and later close the old document.  we have to do this because 
		// 	// each document could have a different window spec.
		// 	
		// 	TiDocument *doc = [[TiController instance] createDocument:newURL visible:YES config:nil];
		// 	[doc setPrecedent:self];
		// 	
		// 	//TODO: window opens slightly offset from current doc, make sure we 
		// 	//get the bounds from self and set on doc
		// 	[listener ignore];
		// }
		// else
		// {
		// 	// tell him to open in the same document and set our new URL
		// 	[self setURL:newURL];
		// 	[listener use];
		// }
		[self setURL:newURL];
		[listener use];
	}
	else if ([protocol isEqual:@"http"] || [protocol isEqual:@"https"])
	{
		// TODO: we need to probalby make this configurable to support
		// opening the URL in the system browser (code below). for now 
		// we just open inside the same frame
		//[[NSWorkspace sharedWorkspace] openURL:newURL];
		[listener use];
	}
	return YES;
}

#pragma mark -
#pragma mark WebPolicyDelegate

- (void)webView:(WebView *)sender decidePolicyForNewWindowAction:(NSDictionary *)actionInformation request:(NSURLRequest *)request newFrameName:(NSString *)frameName decisionListener:(id < WebPolicyDecisionListener >)listener
{
	if (NO == [self newWindowAction:actionInformation request:request listener:listener])
	{
		return;
	}
	[listener ignore];
}

- (void)webView:(WebView *)sender decidePolicyForNavigationAction:(NSDictionary*) actionInformation request:(NSURLRequest*) request frame:(WebFrame*)frame decisionListener:(id <WebPolicyDecisionListener>)listener
{
	int type = [[actionInformation objectForKey:WebActionNavigationTypeKey] intValue];
	
	switch (type)
	{
		case WebNavigationTypeBackForward:
		case WebNavigationTypeReload:
		{
			[listener use];
			return;
		}
		case WebNavigationTypeLinkClicked:
		case WebNavigationTypeFormSubmitted:
		case WebNavigationTypeFormResubmitted:
		{
			break;
		}
		case WebNavigationTypeOther:
		{
			break;
		}
		default:
		{
			[listener ignore];
			return;
		}
	}
	NSString *protocol = [[actionInformation objectForKey:WebActionOriginalURLKey] scheme]; 
	NSURL *newURL = [request URL];
	if ([newURL isEqual:url])
	{
		TRACE(@"Attempting to navigate to the same URL: %@",newURL);
		[listener use];
		return ;
	}
	
	if ([protocol isEqual:@"app"])
	{
		// we only care about loading new TiDocuments if this is the main frame,
		// otherwise we're an internal frame of some kind
		if (frame != [[frame webView] mainFrame]) {
			[listener use];
			[self setURL:newURL];
			return;
		}
		
		// if ([[TiController instance] shouldOpenInNewWindow])
		// {
		// 	// if we're trying to open an internal page, we essentially need to always open a 
		// 	// new document and later close the old document.  we have to do this because 
		// 	// each document could have a different window spec.
		// 	
		// 	TiDocument *doc = [[TiController instance] createDocument:newURL visible:YES config:nil];
		// 	[doc setPrecedent:self];
		// 	
		// 	//TODO: window opens slightly offset from current doc, make sure we 
		// 	//get the bounds from self and set on doc
		// 	[listener ignore];
		// }
		// else
		// {
		// 	// tell him to open in the same document and set our new URL
		// 	[self setURL:newURL];
		// 	[listener use];
		// }
		[self setURL:newURL];
		[listener use];
	}
	else if ([protocol isEqual:@"http"] || [protocol isEqual:@"https"])
	{
		if (NO == [self newWindowAction:actionInformation request:request listener:listener])
		{
			return;
		}
		
		[self setURL:newURL];
		[listener use];
	}
	else
	{
		TRACE(@"Application attempted to navigate to illegal location: %@", newURL);
		[listener ignore];
	}
}

// WebFrameLoadDelegate Methods
#pragma mark -
#pragma mark WebFrameLoadDelegate

- (void)webView:(WebView *)sender didStartProvisionalLoadForFrame:(WebFrame *)frame
{
    // Only report feedback for the main frame.
    if (frame == [sender mainFrame]) 
	{
		scriptCleared = NO;
    }
}

- (void)webView:(WebView *)sender didReceiveTitle:(NSString *)title forFrame:(WebFrame *)frame
{
    // Only report feedback for the main frame.
    if (frame == [sender mainFrame]) 
	{
		[window setTitle:title];
    }
}

- (void)inject:(WebScriptObject *)windowScriptObject context:(JSContextRef)context
{
	kroll::StaticBoundObject* ti = host->GetGlobalObject();
	JSObjectRef jsTi = KrollBoundObjectToJSValue(context,ti);
	id tiJS = [WebScriptObject scriptObjectForJSObject:jsTi originRootObject:[windowScriptObject _rootObject] rootObject:[windowScriptObject _rootObject]];
	[windowScriptObject setValue:tiJS forKey:@"ti"];
	[tiJS release];
	scriptCleared = YES;
}

- (void)webView:(WebView *)sender didFinishLoadForFrame:(WebFrame *)frame
{
    // Only report feedback for the main frame.
    if (frame == [sender mainFrame]) 
	{
		NSURL *theurl =[[[frame dataSource] request] URL];
		TRACE(@"webview_delegate::didFinishLoadForFrame: %x for url: %@",self,theurl);

		if (!scriptCleared)
		{
			TRACE(@"page loaded with no <script> tags, manually injecting Titanium runtime", scriptCleared);
			JSContextRef context = [frame globalContext];
			[self inject:[frame windowObject] context:context];
		}
		
		if (![theurl isEqual:url])
		{
			[self setURL:theurl];
		}
		[self closePrecedent];
		
		// let the controller know we're open and ready
		// [TiController documentOpened:self];

		if (initialDisplay==NO)
		{
			initialDisplay=YES;
			// cause the initial window to show since it was initially opened hidden
			// so you don't get the nasty wide screen while content is loading
			[self performSelector:@selector(show) withObject:nil afterDelay:.005];
		}
    }
}

- (void)webView:(WebView *)sender didFailProvisionalLoadWithError:(NSError *)error forFrame:(WebFrame *)frame
{
    // Only report feedback for the main frame.
    if (frame == [sender mainFrame]) 
	{
		if ([error code]==-999 && [[error domain] isEqual:NSURLErrorDomain])
		{
			//this is OK, this is a cancel to a pending web load request and can be ignored...
			return;
		}
		NSString *err = [NSString stringWithFormat:@"Error loading URL: %@. %@", url,[error localizedDescription]];
		//[TiController error:err];
		TRACE(@"error: %@",err);
		
		// in this case we need to ensure that the window is showing if not initially shown
		if (initialDisplay==NO)
		{
			initialDisplay=YES;
			[self performSelector:@selector(show) withObject:nil afterDelay:.500];
		}
    }
}

- (void)webView:(WebView *)sender didClearWindowObject:(WebScriptObject *)windowScriptObject forFrame:(WebFrame*)frame 
{
	TRACE(@"webview_delegate::didClearWindowObject = %x",self);
	JSContextRef context = [frame globalContext];
	[self inject:windowScriptObject context:context];
}

// WebUIDelegate Methods
#pragma mark -
#pragma mark WebUIDelegate

- (WebView *)webView:(WebView *)sender createWebViewWithRequest:(NSURLRequest *)request
{
	// this is called when you attempt to create a new child window from this document
	// for example using window.open
	NSURL *newurl = [request URL];
	if (newurl==nil)
	{
		// this will be null in certain cases where the browser want's to call loadURL
		// on the new webview and he will pass nil .... just open a blank document
		// and return
		newurl = [NSURL URLWithString:@"about:blank"];
	}
	// TiDocument *newDoc = [[TiController instance] createDocument:newurl visible:YES config:nil];
	// [newDoc setPrecedent:self];
	// return [newDoc webView];
	return nil;
}

- (void)webViewShow:(WebView *)sender
{
	TRACE(@"webview_delegate::webViewShow = %x",self);
    // id myDocument = [[NSDocumentController sharedDocumentController] documentForWindow:[sender window]];
    //   [myDocument showWindows];
}


// WebResourceLoadDelegate Methods
#pragma mark -
#pragma mark WebResourceLoadDelegate

- (void)webViewClose:(WebView *)wv 
{
	TRACE(@"webview_delegate::webViewClose = %x",self);
	[[wv window] close];
	if (inspector)
	{
		[inspector webViewClosed];
	}
}


- (void)webViewFocus:(WebView *)wv 
{
	TRACE(@"webview_delegate::webViewFocus = %x",self);
	// [[TiController instance] activate:self];
	[[wv window] makeKeyAndOrderFront:wv];
}


- (void)webViewUnfocus:(WebView *)wv 
{
	TRACE(@"webview_delegate::webViewUnfocus = %x",self);
	if ([[wv window] isKeyWindow] || [[[wv window] attachedSheet] isKeyWindow]) 
	{
		[NSApp _cycleWindowsReversed:FALSE];
	}
	// [[TiController instance] deactivate:self];
}


- (NSResponder *)webViewFirstResponder:(WebView *)wv 
{
	return [[wv window] firstResponder];
}


- (void)webView:(WebView *)wv makeFirstResponder:(NSResponder *)responder 
{
	[[wv window] makeFirstResponder:responder];
}


- (NSString *)webViewStatusText:(WebView *)wv 
{
	return nil;
}


- (BOOL)webViewIsResizable:(WebView *)wv 
{
	return [[wv window] showsResizeIndicator];
}


- (void)webView:(WebView *)wv setResizable:(BOOL)resizable; 
{
	[[wv window] setShowsResizeIndicator:resizable];
}


- (void)webView:(WebView *)wv setFrame:(NSRect)frame 
{
	TRACE(@"webview_delegate::setFrame = %x",self);
	[[wv window] setFrame:frame display:YES];
}


- (NSRect)webViewFrame:(WebView *)wv 
{
	NSWindow *w = [wv window];
	return w == nil ? NSZeroRect : [w frame];
}


- (BOOL)webViewAreToolbarsVisible:(WebView *)wv 
{
	return NO;
}


- (BOOL)webViewIsStatusBarVisible:(WebView *)wv 
{
	return NO;
}

- (id)webView:(WebView *)sender identifierForInitialRequest:(NSURLRequest *)request fromDataSource:(WebDataSource *)dataSource
{
    // Return some object that can be used to identify this resource
	// we just ignore this for now
	return nil;
}

-(NSURLRequest *)webView:(WebView *)sender resource:(id)identifier willSendRequest:(NSURLRequest *)request redirectResponse:(NSURLResponse *)redirectResponsefromDataSource:(WebDataSource *)dataSource
{
	TRACE(@"webview_delegate::willSendRequest = %x",self);
    return request;
}

-(void)webView:(WebView *)sender resource:(id)identifier didFailLoadingWithError:(NSError *)error fromDataSource:(WebDataSource *)dataSource
{
	TRACE(@"webview_delegate::didFailLoadingWithError = %@", [error localizedDescription]);
}

-(void)webView:(WebView *)sender resource:(id)identifier didFinishLoadingFromDataSource:(WebDataSource *)dataSource
{
}

- (void)webView:(WebView *)wv runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WebFrame *)frame 
{
	NSLog(@"alert = %@",message);
	
	NSRunInformationalAlertPanel(NSLocalizedString(@"JavaScript", @""),	// title
								 message,								// message
								 NSLocalizedString(@"OK", @""),			// default button
								 nil,									// alt button
								 nil);									// other button	
}


- (BOOL)webView:(WebView *)wv runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WebFrame *)frame 
{
	NSInteger result = NSRunInformationalAlertPanel(NSLocalizedString(@"JavaScript", @""),	// title
													message,								// message
													NSLocalizedString(@"OK", @""),			// default button
													NSLocalizedString(@"Cancel", @""),		// alt button
													nil);
	return NSAlertDefaultReturn == result;	
}


- (void)webView:(WebView *)wv runOpenPanelForFileButtonWithResultListener:(id <WebOpenPanelResultListener>)resultListener 
{
	NSOpenPanel *openPanel = [NSOpenPanel openPanel];
	[openPanel beginSheetForDirectory:nil 
								 file:nil 
					   modalForWindow:window
						modalDelegate:self
					   didEndSelector:@selector(openPanelDidEnd:returnCode:contextInfo:) 
						  contextInfo:resultListener];	
}


- (void)openPanelDidEnd:(NSSavePanel *)openPanel returnCode:(int)returnCode contextInfo:(void *)contextInfo 
{
	id <WebOpenPanelResultListener>resultListener = (id <WebOpenPanelResultListener>)contextInfo;
	if (NSOKButton == returnCode) {
		[resultListener chooseFilename:[openPanel filename]];
	}
}


- (BOOL)webView:(WebView *)wv shouldReplaceUploadFile:(NSString *)path usingGeneratedFilename:(NSString **)filename 
{
	return NO;
}


- (NSString *)webView:(WebView *)wv generateReplacementFile:(NSString *)path 
{
	return nil;
}


- (BOOL)webView:(WebView *)wv shouldBeginDragForElement:(NSDictionary *)element dragImage:(NSImage *)dragImage mouseDownEvent:(NSEvent *)mouseDownEvent mouseDraggedEvent:(NSEvent *)mouseDraggedEvent 
{
	return YES;
}


- (NSUInteger)webView:(WebView *)wv dragDestinationActionMaskForDraggingInfo:(id <NSDraggingInfo>)draggingInfo 
{
	return WebDragDestinationActionAny;
}


- (void)webView:(WebView *)webView willPerformDragDestinationAction:(WebDragDestinationAction)action forDraggingInfo:(id <NSDraggingInfo>)draggingInfo 
{
}


- (NSUInteger)webView:(WebView *)wv dragSourceActionMaskForPoint:(NSPoint)point
{
	return WebDragSourceActionAny;
}

#pragma mark -
#pragma mark WebScriptDebugDelegate

// some source was parsed, establishing a "source ID" (>= 0) for future reference
- (void)webView:(WebView *)webView       didParseSource:(NSString *)source
 baseLineNumber:(NSUInteger)lineNumber
		fromURL:(NSURL *)aurl
	   sourceId:(int)sid
	forWebFrame:(WebFrame *)webFrame
{
	TRACE(@"loading javascript from %@ with sid: %d",[aurl absoluteURL],sid);
	// NSString *key = [NSString stringWithFormat:@"%d",sid];
	// NSString *value = [NSString stringWithFormat:@"%@",(aurl==nil? @"<main doc>" : aurl)];
	// //TODO: trim off app://<aid>/
	// [javascripts setObject:value forKey:key];
}

// some source failed to parse
- (void)webView:(WebView *)webView  failedToParseSource:(NSString *)source
 baseLineNumber:(NSUInteger)lineNumber
		fromURL:(NSURL *)theurl
	  withError:(NSError *)error
	forWebFrame:(WebFrame *)webFrame
{
	TRACE(@"failed to parse javascript from %@ at lineNumber: %d, error: %@",[theurl absoluteURL],lineNumber,[error localizedDescription]);
}

// just entered a stack frame (i.e. called a function, or started global scope)
- (void)webView:(WebView *)webView    didEnterCallFrame:(WebScriptCallFrame *)frame
	   sourceId:(int)sid
		   line:(int)lineno
	forWebFrame:(WebFrame *)webFrame
{
}

// about to execute some code
- (void)webView:(WebView *)webView willExecuteStatement:(WebScriptCallFrame *)frame
	   sourceId:(int)sid
		   line:(int)lineno
	forWebFrame:(WebFrame *)webFrame
{
	// NOTE: this is very chatty and prints out each line as it's being executed
	//	TRACE(@"executing javascript lineNumber: %d",lineno);
}

// about to leave a stack frame (i.e. return from a function)
- (void)webView:(WebView *)webView   willLeaveCallFrame:(WebScriptCallFrame *)frame
	   sourceId:(int)sid
		   line:(int)lineno
	forWebFrame:(WebFrame *)webFrame
{
}

// exception is being thrown
- (void)webView:(WebView *)webView   exceptionWasRaised:(WebScriptCallFrame *)frame
	   sourceId:(int)sid
		   line:(int)lineno
	forWebFrame:(WebFrame *)webFrame
{
	// NSString *key = [NSString stringWithFormat:@"%d",sid];
	// for (id akey in javascripts)
	// {
	// 	if ([key isEqualToString:akey])
	// 	{
	// 		NSString *aurl = [javascripts objectForKey:akey];
	// 		TRACE(@"raising javascript exception at lineNumber: %d in %@ (%d)",lineno,aurl,sid);
	// 		break;
	// 	}
	// }
}

@end

