/**
 * REST controllers, the exception handler and security configuration.
 * Controllers parse the request, call one service from {@code infrastructure} and return a type from
 * {@code contracts}. They never use repositories or entities directly.
 */
package com.levi9.reddit.auth.api;
