/**
 * Appcelerator Titanium - licensed under the Apache Public License 2
 * see LICENSE in the root folder for details on the license.
 * Copyright (c) 2009 Appcelerator, Inc. All Rights Reserved.
 */
#include "proxy.h"

namespace ti
{
	Proxy::Proxy(const std::string& _hostname,
		const std::string& _port,
		const std::string& _username,
		const std::string& _password)
		: hostname(_hostname),
		  port(_port),
		  username(_username),
		  password(_password)
	{

		/**
		 * @tiapi(method=True,name=Titanium.Network.Proxy.getHostName,since=0.4) returns a string object containing the hostname 
		 * @tiresult(for=Titanium.Network.Proxy.getHostName, type=string)
		 */
		this->SetMethod("getHostName",&Proxy::getHostName);

		/**
		 * @tiapi(method=True,name=Titanium.Network.Proxy.getPort,since=0.4) returns a string object containing the port 
		 * @tiresult(for=Titanium.Network.Proxy.getPort, type=string)
		 */
		this->SetMethod("getPort",&Proxy::getPort);
		
		/**
		 * @tiapi(method=True,name=Titanium.Network.Proxy.getUserName,since=0.4) returns a string object containing the username 
		 * @tiresult(for=Titanium.Network.Proxy.getUserName, type=string)
		 */
		this->SetMethod("getUserName",&Proxy::getUserName);
		
		/**
		 * @tiapi(method=True,name=Titanium.Network.Proxy.getPassword,since=0.4) returns a string object containing the password 
		 * @tiresult(for=Titanium.Network.Proxy.getPassword, type=string)
		 */
		this->SetMethod("getPassword",&Proxy::getPassword);
	}

	Proxy::~Proxy()
	{
	}
	
	void Proxy::getHostName(const ValueList& args, SharedValue result)
	{
		result->SetString(this->hostname.c_str());
	}
	
	void Proxy::getPort(const ValueList& args, SharedValue result)
	{
		result->SetString(this->port.c_str());
	}

	void Proxy::getUserName(const ValueList& args, SharedValue result)
	{
		result->SetString(this->username.c_str());
	}

	void Proxy::getPassword(const ValueList& args, SharedValue result)
	{
		result->SetString(this->password.c_str());
	}
}
