package com.trazagen.afis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.cbor.CBORFactory;
import com.machinezoo.sourceafis.FingerprintImage;
import com.machinezoo.sourceafis.FingerprintImageOptions;
import com.machinezoo.sourceafis.FingerprintMatcher;
import com.machinezoo.sourceafis.FingerprintTemplate;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Operaciones biométricas con SourceAFIS. Sin estado salvo un caché de plantillas deserializadas. */
public final class Motor {
    private static final ObjectMapper CBOR = new ObjectMapper(new CBORFactory());

    public record Minucia(int x, int y, double direction, String type) {}

    public record Extraccion(String template, int minutiaCount, List<Minucia> minutiae,
                             int width, int height, double dpi, String png) {}

    public record Candidata(String id, String template) {}

    public record Puntaje(String id, double score, boolean match) {}

    /** Caché LRU de plantillas deserializadas, indexado por SHA-256 de los bytes. */
    private final Map<String, FingerprintTemplate> cache = new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, FingerprintTemplate> e) {
            return size() > 5000;
        }
    };

    public Extraccion extraer(byte[] imagen, double dpi) throws IOException {
        if (dpi < 100 || dpi > 2000) throw new IllegalArgumentException("DPI fuera de rango (100-2000).");
        // SourceAFIS no es invariante a escala: el DPI declarado es obligatorio.
        FingerprintImage fi = new FingerprintImage(imagen, new FingerprintImageOptions().dpi(dpi));
        FingerprintTemplate template = new FingerprintTemplate(fi);
        byte[] bytes = template.toByteArray();
        List<Minucia> minucias = minucias(bytes);

        BufferedImage bi = ImageIO.read(new ByteArrayInputStream(imagen));
        String png = null;
        int w = 0, h = 0;
        if (bi != null) {
            w = bi.getWidth();
            h = bi.getHeight();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(bi, "png", out);
            png = Base64.getEncoder().encodeToString(out.toByteArray());
        }
        return new Extraccion(Base64.getEncoder().encodeToString(bytes), minucias.size(), minucias, w, h, dpi, png);
    }

    /**
     * La plantilla serializada de SourceAFIS 3.x es CBOR con arreglos paralelos:
     * positionsX, positionsY, directions (radianes) y types ('E' = terminación, 'B' = bifurcación).
     */
    static List<Minucia> minucias(byte[] plantilla) throws IOException {
        JsonNode n = CBOR.readTree(plantilla);
        JsonNode xs = n.get("positionsX"), ys = n.get("positionsY"), ds = n.get("directions");
        String tipos = n.path("types").asText("");
        List<Minucia> lista = new ArrayList<>();
        if (xs == null || ys == null || ds == null) return lista;
        for (int i = 0; i < xs.size(); i++) {
            char t = i < tipos.length() ? tipos.charAt(i) : '?';
            lista.add(new Minucia(xs.get(i).asInt(), ys.get(i).asInt(), ds.get(i).asDouble(),
                    t == 'B' ? "BIFURCATION" : t == 'E' ? "ENDING" : "UNKNOWN"));
        }
        return lista;
    }

    public List<Puntaje> identificar(String sondaB64, List<Candidata> candidatas, double umbral) {
        FingerprintTemplate sonda = plantilla(sondaB64);
        // Un solo matcher para la sonda, reutilizado contra todas las candidatas (1:N).
        FingerprintMatcher matcher = new FingerprintMatcher(sonda);
        List<Puntaje> res = new ArrayList<>(candidatas.size());
        for (Candidata c : candidatas) {
            double s = matcher.match(plantilla(c.template()));
            res.add(new Puntaje(c.id(), Math.round(s * 100.0) / 100.0, s >= umbral));
        }
        res.sort(Comparator.comparingDouble(Puntaje::score).reversed());
        return res;
    }

    private FingerprintTemplate plantilla(String b64) {
        byte[] bytes = Base64.getDecoder().decode(b64);
        String clave = sha256(bytes);
        synchronized (cache) {
            FingerprintTemplate t = cache.get(clave);
            if (t != null) return t;
        }
        FingerprintTemplate t = new FingerprintTemplate(bytes);
        synchronized (cache) {
            cache.put(clave, t);
        }
        return t;
    }

    static String sha256(byte[] b) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
