//
// Copyright 2006-2008 Appcelerator, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "ti_web_view_delegate.h"
#include "ti_utils.h"

TIWebViewDelegate::TIWebViewDelegate() {
}

TIWebViewDelegate::~TIWebViewDelegate() {
}

void TIWebViewDelegate::setHost(WebViewHost* host) {
	this->host = host;
}

void TIWebViewDelegate::setHWND(HWND hWnd) {
	this->hWnd = hWnd;
}

gfx::ViewHandle TIWebViewDelegate::GetContainingWindow(WebWidget* webwidget) {
	ti_debug("::: GetContainingWindow");
	if (host != NULL) return host->window_handle();
	return NULL;
}

// Called when a region of the WebWidget needs to be re-painted.
void TIWebViewDelegate::DidInvalidateRect(WebWidget* webwidget, const gfx::Rect& rect) {

	ti_debug("::: Did Invalidate Rect");
	if (host != NULL) host->DidInvalidateRect(rect);

}

// Called when a region of the WebWidget, given by clip_rect, should be
// scrolled by the specified dx and dy amounts.
void TIWebViewDelegate::DidScrollRect(WebWidget* webwidget, int dx, int dy,
	const gfx::Rect& clip_rect) {

		ti_debug(":::Did Scroll Rect");
		host->DidScrollRect(dx, dy, clip_rect);
}

// This method is called to instruct the window containing the WebWidget to
// show itself as the topmost window.  This method is only used after a
// successful call to CreateWebWidget.  |disposition| indicates how this new
// window should be displayed, but generally only means something for WebViews.
void TIWebViewDelegate::Show(WebWidget* webwidget, WindowOpenDisposition disposition) {
	ShowWindow(hWnd, SW_SHOW);
	UpdateWindow(hWnd);
	ti_debug("::::::: SHOW WINDOW");
}

// This method is called to instruct the window containing the WebWidget to
// close.  Note: This method should just be the trigger that causes the
// WebWidget to eventually close.  It should not actually be destroyed until
// after this call returns.
void TIWebViewDelegate::CloseWidgetSoon(WebWidget* webwidget) {
	PostMessage(hWnd, WM_CLOSE, 0, 0);
}

// This method is called to focus the window containing the WebWidget so
// that it receives keyboard events.
void TIWebViewDelegate::Focus(WebWidget* webwidget) {
	SetFocus(hWnd);

	ti_debug("::::::::::::FOCUS WINDOW");
}

// This method is called to unfocus the window containing the WebWidget so that
// it no longer receives keyboard events.
void TIWebViewDelegate::Blur(WebWidget* webwidget) {
	if (::GetFocus() == hWnd) { SetFocus(NULL); }
}

void TIWebViewDelegate::SetCursor(WebWidget* webwidget, 
	const WebCursor& cursor) {

}

// Returns the rectangle of the WebWidget in screen coordinates.
void TIWebViewDelegate::GetWindowRect(WebWidget* webwidget, gfx::Rect* out_rect) {
	RECT rect;
	::GetWindowRect(host->window_handle(), &rect);
	*out_rect = gfx::Rect(rect);

	ti_debug("::::::::: GET WINDOW RECT");
}


// This method is called to re-position the WebWidget on the screen.  The given
// rect is in screen coordinates.  The implementation may choose to ignore
// this call or modify the given rect.  This method may be called before Show
// has been called.
// TODO(darin): this is more of a request; does this need to take effect
// synchronously?
void TIWebViewDelegate::SetWindowRect(WebWidget* webwidget, const gfx::Rect& rect) {

}

// Returns the rectangle of the window in which this WebWidget is embeded in.
void TIWebViewDelegate::GetRootWindowRect(WebWidget* webwidget, gfx::Rect* out_rect) {
	ti_debug("::: Get Root Window Rect");
	RECT rect;
	HWND root_window = ::GetAncestor(host->window_handle(), GA_ROOT);
	::GetWindowRect(root_window, &rect);
	*out_rect = gfx::Rect(rect);
}

// Keeps track of the necessary window move for a plugin window that resulted
// from a scroll operation.  That way, all plugin windows can be moved at the
// same time as each other and the page.
void TIWebViewDelegate::DidMove(WebWidget* webwidget, const WebPluginGeometry& move) {
	WebPluginDelegateImpl::MoveWindow(
		move.window, move.window_rect, move.clip_rect, move.cutout_rects,
		move.visible);
}

// Suppress input events to other windows, and do not return until the widget
// is closed.  This is used to support |window.showModalDialog|.
void TIWebViewDelegate::RunModal(WebWidget* webwidget){

}

// Owners depend on the delegates living as long as they do, so we ref them.
void TIWebViewDelegate::AddRef() {
	base::RefCounted<TIWebViewDelegate>::AddRef();
}

void TIWebViewDelegate::Release() {
	base::RefCounted<TIWebViewDelegate>::Release();
}

// Returns true if the widget is in a background tab.
bool TIWebViewDelegate::IsHidden() {
	return false;
}