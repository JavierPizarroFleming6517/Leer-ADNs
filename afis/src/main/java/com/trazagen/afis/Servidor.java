package com.trazagen.afis;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * Microservicio HTTP de huellas para TrazaGen. Sin framework: com.sun.net.httpserver + Jackson.
 *
 * POST /extract   {"image": base64, "dpi": 500}
 * POST /identify  {"probe": base64, "candidates": [{"id","template"}], "threshold": 40}
 * GET  /health
 */
public final class Servidor {
    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final int MAX_BYTES = 40 * 1024 * 1024;
    private static final int MAX_CANDIDATAS = 100_000;

    public static void main(String[] args) throws IOException {
        String host = env("AFIS_HOST", "127.0.0.1");
        int port = Integer.parseInt(env("AFIS_PORT", "7070"));
        double umbralDefecto = Double.parseDouble(env("AFIS_THRESHOLD", "40"));
        Motor motor = new Motor();

        HttpServer server = HttpServer.create(new InetSocketAddress(host, port), 64);
        server.setExecutor(Executors.newFixedThreadPool(Math.max(2, Runtime.getRuntime().availableProcessors())));

        server.createContext("/health", ex -> {
            if (!metodo(ex, "GET")) return;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("status", "ok");
            r.put("engine", "SourceAFIS");
            r.put("version", versionSourceAfis());
            r.put("threshold", umbralDefecto);
            responder(ex, 200, r);
        });

        server.createContext("/extract", ex -> {
            if (!metodo(ex, "POST")) return;
            try {
                JsonNode body = leer(ex);
                String img = body.path("image").asText("");
                double dpi = body.path("dpi").asDouble(500);
                if (img.isEmpty()) {
                    error(ex, 400, "Falta la imagen (campo image en base64).");
                    return;
                }
                byte[] bytes = Base64.getDecoder().decode(img);
                responder(ex, 200, motor.extraer(bytes, dpi));
            } catch (IllegalArgumentException e) {
                error(ex, 400, e.getMessage() == null ? "Solicitud no válida." : e.getMessage());
            } catch (Throwable e) {
                error(ex, 422, "No se pudo procesar la imagen de la huella: " + e.getClass().getSimpleName());
            }
        });

        server.createContext("/identify", ex -> {
            if (!metodo(ex, "POST")) return;
            try {
                JsonNode body = leer(ex);
                String probe = body.path("probe").asText("");
                if (probe.isEmpty()) {
                    error(ex, 400, "Falta la plantilla sonda (probe).");
                    return;
                }
                double umbral = body.has("threshold") ? body.get("threshold").asDouble() : umbralDefecto;
                List<Motor.Candidata> cands = new ArrayList<>();
                for (JsonNode c : body.path("candidates")) {
                    cands.add(new Motor.Candidata(c.path("id").asText(), c.path("template").asText()));
                    if (cands.size() > MAX_CANDIDATAS) throw new IllegalArgumentException("Demasiadas candidatas.");
                }
                long t0 = System.nanoTime();
                List<Motor.Puntaje> res = motor.identificar(probe, cands, umbral);
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("threshold", umbral);
                r.put("candidates", cands.size());
                r.put("millis", (System.nanoTime() - t0) / 1_000_000);
                r.put("results", res);
                responder(ex, 200, r);
            } catch (IllegalArgumentException e) {
                error(ex, 400, e.getMessage() == null ? "Solicitud no válida." : e.getMessage());
            } catch (Throwable e) {
                error(ex, 422, "No se pudo comparar: plantilla no válida.");
            }
        });

        server.start();
        System.out.println("AFIS (SourceAFIS " + versionSourceAfis() + ") escuchando en http://" + host + ":" + port
                + " - umbral " + umbralDefecto);
    }

    private static String versionSourceAfis() {
        String v = com.machinezoo.sourceafis.FingerprintTemplate.class.getPackage().getImplementationVersion();
        return v == null ? "3.18.1" : v;
    }

    private static String env(String k, String def) {
        String v = System.getenv(k);
        return v == null || v.isBlank() ? def : v.trim();
    }

    private static boolean metodo(HttpExchange ex, String m) throws IOException {
        if (!ex.getRequestMethod().equalsIgnoreCase(m)) {
            error(ex, 405, "Método no permitido.");
            return false;
        }
        return true;
    }

    private static JsonNode leer(HttpExchange ex) throws IOException {
        try (InputStream in = ex.getRequestBody()) {
            byte[] datos = in.readNBytes(MAX_BYTES + 1);
            if (datos.length > MAX_BYTES) throw new IllegalArgumentException("Cuerpo demasiado grande.");
            return JSON.readTree(datos);
        }
    }

    private static void error(HttpExchange ex, int status, String msg) throws IOException {
        responder(ex, status, Map.of("error", msg));
    }

    private static void responder(HttpExchange ex, int status, Object cuerpo) throws IOException {
        byte[] out = JSON.writeValueAsBytes(cuerpo);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, out.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(out);
        }
    }
}
