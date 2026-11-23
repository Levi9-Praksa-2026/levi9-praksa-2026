/**
 * REST controllers. They parse the request, call one service from {@code service} and return a type from
 * {@code dto}. They never use repositories or entities directly. Also holds the web-layer helpers they need:
 * reading the caller from the JWT and the converter that reads JSON parts of multipart requests.
 */
package com.levi9.reddit.post.controller;
