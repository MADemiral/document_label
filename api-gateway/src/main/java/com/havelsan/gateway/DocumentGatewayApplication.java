package com.havelsan.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class DocumentGatewayApplication {

	public static void main(String[] args) {
		SpringApplication.run(DocumentGatewayApplication.class, args);
	}

@Bean
public RouteLocator documentRouter(RouteLocatorBuilder builder) {
	return builder.routes()
		.route("analyze-document", r -> r
			.path("/analyze-document")
			.uri("http://127.0.0.1:8002")) 

		.route("search", r -> r
			.path("/search")
			.uri("http://localhost:8001"))
		
			.route("confirm-document", r -> r
			.path("/confirm-document")
			.uri("http://localhost:8001"))
			 
		.route("get-labels", r -> r
			.path("/get-labels")
			.uri("http://localhost:8003"))

				.route("label-suggestions", r -> r
			.path("/label-suggestions")
			.uri("http://localhost:8003"))

		 .route("semantic-search", r -> r
			.path("/semantic-search")
			.uri("http://localhost:8001"))

			.route("search-documents-by-label", r -> r
			.path("/search-documents-by-label")
			.uri("http://localhost:8003"))

			.route("get-all-documents", r -> r
			.path("/get-all-documents")
			.uri("http://localhost:8003"))
		.route("delete-document", r -> r
			.path("/delete-document/{document_id}")
			.uri("http://localhost:8003"))
		.build();

	
}

@RestController
public class FallbackController {
    @RequestMapping("/fallback")
    public String fallback() {
        return "Generic fallback";
    }

    @RequestMapping("/fallback/documentServiceFallback")
    public String docFallback() {
        return "Document service fallback";
    }
}

@Bean
public GlobalFilter customLogFilter() {
    return (exchange, chain) -> {
        System.out.println("Gelen istek: " + exchange.getRequest().getURI());
        return chain.filter(exchange);
    };
}

}
